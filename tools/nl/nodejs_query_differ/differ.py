# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import logging
import os

from absl import app
from absl import flags
from deepdiff import DeepDiff
from google.cloud import storage


class Mode:
  RUN_DIFF = 'diff'
  UPDATE_GOLDENS = 'update'


_GCS_URL = 'https://console.cloud.google.com/storage/browser'
_GCS_BUCKET = 'datcom-website-periodic-testing'
_OUTPUT_FILE = 'differ_results.json'
_GOLDEN_FOLDER = 'goldens'
_DIFF_SUCCESS_MSG = 'Success'
_EMAIL_SUBJECT_KEY = 'subject'
# Use parentheses instead of square brackets to wrap env because otherwise
# Google Groups will ignore that part of the subject when deciding how to
# group conversations.
_EMAIL_SUBJECT_TEMPLATE = '({env}) Failure: Nodejs Query Test'
_EMAIL_MESSAGE_KEY = 'message'
_EMAIL_MESSAGE_TEMPLATE = 'There were diffs found when testing Nodejs Query results against goldens in {env}.<br><br><b>Nodejs Query Results</b>: {test_path}<br><b>Diff results</b>: {results_path}<br>Instructions for debugging: https://playbooks-preview.corp.google.com/datacommons/index.md?cl=head#debugging-nodejs-query-diffs'

FLAGS = flags.FLAGS

flags.DEFINE_string(
    'env',
    'autopush',
    'The environment of the responses to run the differ on. Defaults to autopush.',
    short_name='e')

flags.DEFINE_string(
    'test_folder',
    '',
    'The folder holding the responses to test. Defaults to last folder in gs://datcom-website-periodic-testing/<FLAGS.env>',
    short_name='t')

flags.DEFINE_string(
    'gcs_output_folder',
    '',
    'The gcs folder in the bucket gs://datcom-website-periodic-testing to output results to. Will save results locally if this is empty.',
    short_name='g')

flags.DEFINE_string(
    'failure_email_file',
    '',
    'Name of the file to output an email template to if there were diffs found. If not set, will not output an email template.',
    short_name='f')

flags.DEFINE_enum(
    'mode',
    Mode.RUN_DIFF, [Mode.RUN_DIFF, Mode.UPDATE_GOLDENS],
    'Valid values are diff and update. Diff will get the diffs between goldens and a test run. Update will update the goldens with the test run results.',
    short_name='m')


def get_test_folder(bucket, env):
  """Gets the test folder name for an environment"""
  blobs = bucket.list_blobs(prefix=env)
  # Get all the dates where there have been cron testing runs done
  dates = set()
  for b in blobs:
    date = b.name[len(env) + 1:].split('/')[0]
    dates.add(date)
  sorted_dates = sorted(dates, reverse=True)
  if len(sorted_dates) < 1:
    return ""
  return sorted_dates[0]


def get_diff(test_blobs):
  """Gets the results of getting the diffs between the golden blobs and test blobs"""
  # Get golden jsons
  golden_folder = f'{_GOLDEN_FOLDER}/{FLAGS.env}'
  golden_jsons = {}
  for filename in os.listdir(golden_folder):
    key = filename.split('.')[0]
    with open(f'{golden_folder}/{filename}') as f:
      golden_jsons[key] = json.load(f)

  # Get jsons to test
  test_jsons = {}
  for t in test_blobs:
    key = t.name.split('/')[-1].split('.')[0]
    test_jsons[key] = json.loads(t.download_as_string())

  # Get the diffs between test jsons and golden jsons
  results = {}
  for key, golden_json in golden_jsons.items():
    if not key in test_jsons:
      results[key] = "Missing in test folder"
      continue
    test_json = test_jsons[key]
    if 'debug' in test_json:
      del test_json['debug']
    diff = DeepDiff(golden_json, test_json)
    if diff:
      results[key] = json.dumps(diff.to_json())
    else:
      results[key] = _DIFF_SUCCESS_MSG
  return results


def output_results(results, gcs_bucket) -> str:
  """Outputs results either to gcs or locally"""
  if FLAGS.gcs_output_folder:
    gcs_filename = f'{FLAGS.gcs_output_folder}/{_OUTPUT_FILE}'
    blob = gcs_bucket.blob(gcs_filename)
    with blob.open('w') as f:
      f.write(json.dumps(results, indent=2))
    results_path = f'{_GCS_URL}/{_GCS_BUCKET}/{gcs_filename}'
    logging.info(f'Diff results saved to gcs path: {results_path}')
    return results_path
  else:
    with open(_OUTPUT_FILE, 'w') as f:
      f.write(json.dumps(results, indent=2))
    logging.info(f'Diff results saved locally to: {_OUTPUT_FILE}')
    return _OUTPUT_FILE


def output_failure_email(results, test_folder, results_path):
  """Outputs an email template file if there are diffs found"""
  # Checks for if failure email needs to be written
  email_file = FLAGS.failure_email_file
  if not email_file:
    return
  has_diff = any([v != _DIFF_SUCCESS_MSG for v in results.values()])
  if not has_diff:
    logging.info('No diffs found in the result. Skipping failure email.')
    return

  # generate the email template
  test_path = f'{_GCS_URL}/{_GCS_BUCKET}/{test_folder}'
  email_template = {}
  email_template[_EMAIL_SUBJECT_KEY] = _EMAIL_SUBJECT_TEMPLATE.format(
      env=FLAGS.env)
  email_template[_EMAIL_MESSAGE_KEY] = _EMAIL_MESSAGE_TEMPLATE.format(
      env=FLAGS.env, test_path=test_path, results_path=results_path)

  # write email template to email file
  with open(email_file, 'w') as f:
    f.write(json.dumps(email_template))
    logging.info(f'email template saved at: {email_file}')


def update_goldens(gcs_bucket):
  """Updates all the golden files with new golden blobs"""
  # Iterate through each environment that we have goldens for
  for env in os.listdir(_GOLDEN_FOLDER):
    env_golden_folder = f'{_GOLDEN_FOLDER}/{env}'

    # remove all the current goldens
    for filename in os.listdir(env_golden_folder):
      os.remove(f'{env_golden_folder}/{filename}')

    # get the test blobs
    test_folder_date = get_test_folder(gcs_bucket, env)
    test_folder = f'{env}/{test_folder_date}/nodejs_query/'
    test_blobs = gcs_bucket.list_blobs(prefix=test_folder)

    # add the new test blobs to the goldens folder
    for b in test_blobs:
      filename = b.name.split('/')[-1]
      if filename == 'differ_results.json':
        continue
      golden = json.loads(b.download_as_string())
      if 'debug' in golden:
        del golden['debug']
      with open(f'{_GOLDEN_FOLDER}/{env}/{filename}', 'w') as out:
        out.write(json.dumps(golden, indent=2))


def main(_):
  sc = storage.Client()
  bucket = sc.get_bucket(f'{_GCS_BUCKET}')

  if FLAGS.mode == Mode.UPDATE_GOLDENS:
    # Update goldens for every environment we have goldens for
    update_goldens(bucket)
  else:
    test_folder_date = FLAGS.test_folder or get_test_folder(bucket, FLAGS.env)
    if not test_folder_date:
      logging.info("Could not get test_folder name, please enter one manually.")
      return
    # Get the test blobs
    test_folder = f'{FLAGS.env}/{test_folder_date}/nodejs_query/'
    test_blobs = bucket.list_blobs(prefix=test_folder)
    # Get the diffs
    results = get_diff(test_blobs)
    # Output the diffs
    results_path = output_results(results, bucket)
    # Output a failure email based on the results
    output_failure_email(results, test_folder, results_path)


if __name__ == '__main__':
  app.run(main)
