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

from absl import app
from absl import flags
from deepdiff import DeepDiff
from google.cloud import storage

_GCS_BUCKET = 'datcom-website-periodic-testing'
_OUTPUT_FILE = 'differ_results.json'
_GOLDEN_FOLDER = 'golden'
_DIFF_SUCCESS_MSG = 'Success'
_EMAIL_SUBJECT_KEY = 'subject'
_EMAIL_SUBJECT_TEMPLATE = 'Nodejs Query Test Failure in {env}'
_EMAIL_MESSAGE_KEY = 'message'
_EMAIL_MESSAGE_TEMPLATE = 'There were diffs found when testing Nodejs Query results against goldens in {env}.<br><br><b>Goldens folder</b>: {goldens_path}<br><b>Nodejs Query Results</b>: {test_path}<br><b>Diff results</b>: {results_path}'

FLAGS = flags.FLAGS

flags.DEFINE_string(
    'env', 'autopush',
    'The environment of the responses to run the differ on. Defaults to autopush.'
)

flags.DEFINE_string(
    'test_folder', '',
    'The folder holding the responses to test. Defaults to last folder in gs://datcom-website-periodic-testing/<FLAGS.env>'
)

flags.DEFINE_string(
    'gcs_output_folder', '',
    'The gcs folder in the bucket gs://datcom-website-periodic-testing to output results to. Will save results locally if this is empty.'
)

flags.DEFINE_string(
    'failure_email_file', '',
    'Name of the file to output an email template to if there were diffs found. If not set, will not output an email template.'
)


def get_test_folder(bucket):
  """Gets the test folder name"""
  test_folder = FLAGS.test_folder
  if not test_folder:
    blobs = bucket.list_blobs(prefix=FLAGS.env)
    # Get all the dates where there have been cron testing runs done
    dates = set()
    for b in blobs:
      date = b.name[len(FLAGS.env) + 1:].split('/')[0]
      if date != _GOLDEN_FOLDER:
        dates.add(date)
    sorted_dates = sorted(dates, reverse=True)
    if len(sorted_dates) < 1:
      return
    test_folder = sorted_dates[0]
  return test_folder


def get_diff(golden_blobs, test_blobs):
  """Gets the results of diffing between the base blobs and test blobs"""
  golden_jsons = {}
  for b in golden_blobs:
    key = b.name.split('/')[-1].split('.')[0]
    golden_jsons[key] = json.loads(b.download_as_string())
  test_jsons = {}
  for t in test_blobs:
    key = t.name.split('/')[-1].split('.')[0]
    test_jsons[key] = json.loads(t.download_as_string())

  results = {}
  for key, golden_json in golden_jsons.items():
    if not key in test_jsons:
      results[key] = "Missing in test folder"
      continue
    test_json = test_jsons[key]
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
      f.write(json.dumps(results))
    results_path = f'gs://{_GCS_BUCKET}/{gcs_filename}'
    logging.info(f'Diff results saved to gcs path: {results_path}')
    return results_path
  else:
    with open(_OUTPUT_FILE, 'w') as f:
      f.write(json.dumps(results))
    logging.info(f'Diff results saved locally to: {_OUTPUT_FILE}')
    return _OUTPUT_FILE


def output_failure_email(results, golden_folder, test_folder, results_path):
  """Outputs an email template file if there are diffs found"""
  email_file = FLAGS.failure_email_file
  if not email_file:
    return
  has_diff = any([v != _DIFF_SUCCESS_MSG for v in results.values()])
  if not has_diff:
    logging.info('No diffs found in the result. Skipping failure email.')
    return
  goldens_path = f'gs://{_GCS_BUCKET}/{golden_folder}'
  test_path = f'gs://{_GCS_BUCKET}/{test_folder}'
  email_template = {}
  email_template[_EMAIL_SUBJECT_KEY] = _EMAIL_SUBJECT_TEMPLATE.format(
      env=FLAGS.env)
  email_template[_EMAIL_MESSAGE_KEY] = _EMAIL_MESSAGE_TEMPLATE.format(
      env=FLAGS.env,
      goldens_path=goldens_path,
      test_path=test_path,
      results_path=results_path)
  with open(email_file, 'w') as f:
    f.write(json.dumps(email_template))
    logging.info(f'email template saved at: {email_file}')


def main(_):
  sc = storage.Client()
  bucket = sc.get_bucket(f'{_GCS_BUCKET}')
  test_folder = get_test_folder(bucket)
  if not test_folder:
    logging.info("Could not get test_folder name, please enter one manually.")
    return
  test_folder = f'{FLAGS.env}/{test_folder}/nodejs_query/'
  golden_folder = f'{FLAGS.env}/{_GOLDEN_FOLDER}/nodejs_query/'
  golden_blobs = bucket.list_blobs(prefix=golden_folder)
  test_blobs = bucket.list_blobs(prefix=test_folder)
  results = get_diff(golden_blobs, test_blobs)
  results_path = output_results(results, bucket)
  output_failure_email(results, golden_folder, test_folder, results_path)


if __name__ == '__main__':
  app.run(main)
