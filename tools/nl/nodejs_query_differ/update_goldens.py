# Copyright 2024 Google LLC
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
from google.cloud import storage

_GCS_BUCKET = 'datcom-website-periodic-testing'
_GOLDEN_FOLDER = 'golden'
FLAGS = flags.FLAGS


class Mode:
  FETCH = "fetch"
  PUSH = "push"


flags.DEFINE_string(
    'env',
    'autopush',
    'The environment of the responses to run the differ on. Defaults to autopush.',
    short_name='e')

flags.DEFINE_string(
    'new_golden_folder',
    '',
    'The folder holding the responses to test. Defaults to last folder in gs://datcom-website-periodic-testing/<FLAGS.env>',
    short_name='g')

flags.DEFINE_enum(
    'mode',
    Mode.FETCH, [Mode.FETCH, Mode.PUSH],
    'Valid values are fetch and update. Fetch will fetch the newest goldens and update the local goldens folder. Push will update the goldens on gcs with the ones in the local folder.',
    short_name='m')


def _get_new_goldens_folder(bucket):
  """Gets the name of the folder with the new goldens to update to"""
  new_golden_folder = FLAGS.new_golden_folder
  if not new_golden_folder:
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
    new_golden_folder = sorted_dates[0]
  return new_golden_folder


def fetch_new_goldens(gcs_bucket):
  """Fetch new golden files from gcs and save locally"""
  new_golden_folder = _get_new_goldens_folder(gcs_bucket)
  if not new_golden_folder:
    logging.info(
        "Could not get new_golden_folder name, please enter one manually.")
    return
  new_golden_folder = f'{FLAGS.env}/{new_golden_folder}/nodejs_query/'
  new_golden_blobs = gcs_bucket.list_blobs(prefix=new_golden_folder)
  for b in new_golden_blobs:
    filename = b.name.split('/')[-1]
    golden = json.loads(b.download_as_string())
    del golden['debug']
    with open(f'goldens/{FLAGS.env}/{filename}', 'w') as out:
      out.write(json.dumps(golden))


def update_goldens(gcs_bucket):
  """Upload the local golden files to gcs"""
  gcs_golden_folder = f'{FLAGS.env}/{_GOLDEN_FOLDER}/nodejs_query'
  for blob in gcs_bucket.list_blobs(prefix=gcs_golden_folder):
    blob.delete()
  local_golden_folder = f'goldens/{FLAGS.env}'
  for filename in os.listdir(local_golden_folder):
    blob = gcs_bucket.blob(f'{gcs_golden_folder}/{filename}')
    with open(f'{local_golden_folder}/{filename}') as f:
      golden = json.load(f)
      with blob.open('w') as out:
        out.write(json.dumps(golden))


def main(_):
  sc = storage.Client()
  bucket = sc.get_bucket(f'{_GCS_BUCKET}')
  if FLAGS.mode == Mode.PUSH:
    update_goldens(bucket)
  else:
    fetch_new_goldens(bucket)


if __name__ == '__main__':
  app.run(main)
