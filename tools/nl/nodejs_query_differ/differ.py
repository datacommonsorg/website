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

from absl import app
from absl import flags
from deepdiff import DeepDiff
import json

from google.cloud import storage

_GCS_BUCKET = 'datcom-website-periodic-testing'
_OUTPUT_FILE = 'differ_results.json'

FLAGS = flags.FLAGS

flags.DEFINE_string('env', 'autopush',
                    'The environment of the responses to run the differ on. Defaults to autopush.')

flags.DEFINE_string('base_folder', '',
                    'The folder holding the base responses to test against. Defaults to second last folder in gs://datcom-website-periodic-testing/<FLAGS.env>')

flags.DEFINE_string('test_folder', '',
                    'The folder holding the responses to test. Defaults to last folder in gs://datcom-website-periodic-testing/<FLAGS.env>')

def _get_folder_names(bucket):
  """Gets a tuple of (base folder name, test folder name)"""
  base_folder = FLAGS.base_folder
  test_folder = FLAGS.test_folder
  if not base_folder or not test_folder:
    blobs = bucket.list_blobs(prefix=FLAGS.env)
    # Get all the dates where there have been cron testing runs done
    dates = set()
    for b in blobs:
      date = b.name[len(FLAGS.env) + 1:].split('/')[0]
      dates.add(date)
    sorted_dates = sorted(dates, reverse=True)
    if len(sorted_dates) < 2:
      return
    # set base_folder and test_folder if they weren't passed in as flags
    if not base_folder:
      base_folder = sorted_dates[1]
    if not test_folder:
      test_folder = sorted_dates[0]
  return (base_folder, test_folder)


def run_diff(base_blobs, test_blobs, output_file):
  """Gets the diff between the base blobs and test blobs and output it"""
  base_jsons = {}
  for b in base_blobs:
    key = b.name.split('/')[-1].split('.')[0]
    base_jsons[key] = json.loads(b.download_as_string())
  test_jsons = {}
  for t in test_blobs:
    key = t.name.split('/')[-1].split('.')[0]
    test_jsons[key] = json.loads(t.download_as_string())
  report = {}
  for key, base_json in base_jsons.items():
    if not key in test_jsons:
      report[key] = "Missing in test folder"
    test_json = test_jsons[key]
    del base_json['debug']
    del test_json['debug']
    diff = DeepDiff(base_json, test_json)
    if diff:
      report[key] = json.dumps(diff.to_json())
    else:
      report[key] = 'Success'
  with open(output_file, 'w') as f:
    f.write(json.dumps(report))
  print("Done running differ")
  print(f'Diff report saved locally to: {_OUTPUT_FILE}')


def main(_):
  sc = storage.Client()
  bucket = sc.get_bucket(f'{_GCS_BUCKET}')
  base_folder, test_folder = _get_folder_names(bucket)
  base_blobs = bucket.list_blobs(prefix=f'{FLAGS.env}/{base_folder}/nodejs_query/')
  test_blobs = bucket.list_blobs(prefix=f'{FLAGS.env}/{test_folder}/nodejs_query/')
  run_diff(base_blobs, test_blobs, _OUTPUT_FILE)


if __name__ == '__main__':
  app.run(main)