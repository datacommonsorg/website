# Copyright 2020 Google LLC
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
import urllib.parse

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


def list_png(bucket_name, prefix):
  """Return a list of images in a given bucket and folder prefix.

  Args:
    bucket_name: the bucket where the image is stored.
    prefix: the folder prefix
  Returns:
    An array of base64 encoded images.
  """
  storage_client = storage.Client()
  bucket = storage_client.get_bucket(bucket_name)
  blobs = bucket.list_blobs(prefix=prefix)
  result = {}
  for b in blobs:
    if b.name.endswith('png'):
      bytes = b.download_as_bytes()
      name = b.name.removeprefix(prefix + '/').removesuffix('.png')
      name = urllib.parse.unquote(name)
      result[name] = bytes
  return result
