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

import os

from google.cloud import storage

TEMP_DIR = '/tmp/'
BUCKET = 'datcom-nl-models'


# Given an object-path in `BUCKET`, downloads it to
# TEMP_DIR and returns the local path to downloaded file.
def download(object_path):
  storage_client = storage.Client()
  bucket = storage_client.bucket(bucket_name=BUCKET)
  blob = bucket.get_blob(object_path)
  # Download
  tmp_file = os.path.join(TEMP_DIR, os.path.basename(object_path))
  blob.download_to_filename(tmp_file)
  return tmp_file
