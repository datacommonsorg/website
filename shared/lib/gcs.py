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

TEMP_DIR = '/tmp/'

import os

from google.cloud import storage


#
# Downloads the `filename` from GCS to TEMP_DIR
# and returns its path.
#
def download_file(bucket: str,
                  filename: str,
                  use_anonymous_client: bool = False) -> str:
  if use_anonymous_client:
    storage_client = storage.Client.create_anonymous_client()
  else:
    storage_client = storage.Client()
  bucket = storage_client.bucket(bucket_name=bucket)
  blob = bucket.get_blob(filename)
  # Download
  local_file_path = _get_local_path(filename)
  blob.download_to_filename(local_file_path)
  return local_file_path


def get_or_download_file(bucket: str,
                         filename: str,
                         use_anonymous_client: bool = False) -> str:
  """Returns the local file path if the file already exists. 
  Otherwise it downloads the file from GCS and returns the path it was downloaded to.
  """
  local_file_path = _get_local_path(filename)
  if os.path.exists(local_file_path):
    return local_file_path
  return download_file(bucket, filename, use_anonymous_client)


def _get_local_path(filename: str) -> str:
  return os.path.join(TEMP_DIR, filename)
