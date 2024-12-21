# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import collections

from google.cloud import storage


def list_blobs(bucket_name, max_blobs):
  """Return a dictionary of three recent blobs in the bucket.

  Args:
    bucket_name: the bucket where the feed is stored.
    max_blobs: the maximum blobs to list.
  Returns:
    Ordered dictionary of three recent blobs, most recent first.
  """
  storage_client = storage.Client()
  bucket = storage_client.get_bucket(bucket_name)

  blobs = bucket.list_blobs()

  json_blobs = []
  for b in blobs:
    if b.name.endswith('.json'):
      json_blobs.append(b)

  recent_blobs = sorted(json_blobs, key=lambda blob: blob.updated, reverse=True)
  d = collections.OrderedDict()
  num_blobs = 0
  for b in recent_blobs:
    formatted_date = b.updated.strftime('%Y-%m-%d %H:%M:%S')
    d[formatted_date] = b
    num_blobs += 1
    if num_blobs == max_blobs:
      break
  return d


def read_blob(bucket_name, blob_name):
  storage_client = storage.Client()
  bucket = storage_client.get_bucket(bucket_name)
  blob = bucket.get_blob(blob_name)
  return blob.download_as_bytes()


def list_folder(bucket_name, prefix, start_offset='', end_offset=''):
  storage_client = storage.Client()
  bucket = storage_client.get_bucket(bucket_name)
  start_offset = prefix + '/' + start_offset
  end_offset = prefix + '/' + end_offset
  blobs = bucket.list_blobs(prefix=prefix,
                            start_offset=start_offset,
                            end_offset=end_offset)
  folders = set()
  for blob in blobs:
    parts = blob.name.split('/')
    # A sub directory blob is in the form of <prefix>/sub-directory/
    if len(parts) == 3:
      folders.add(parts[1])
  res = list(folders)
  res.sort()
  return res
