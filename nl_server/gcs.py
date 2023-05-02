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

BUCKET = 'datcom-nl-models'
TEMP_DIR = '/tmp/'

import os

from google.cloud import storage


# Downloads the `embeddings_file` from GCS to TEMP_DIR
# and return its path.
def download_embeddings(embeddings_file: str) -> str:
  storage_client = storage.Client()
  bucket = storage_client.bucket(bucket_name=BUCKET)
  blob = bucket.get_blob(embeddings_file)
  # Download
  local_embeddings_path = local_path(embeddings_file)
  blob.download_to_filename(local_embeddings_path)
  return local_embeddings_path


def local_path(embeddings_file: str) -> str:
  return os.path.join(TEMP_DIR, embeddings_file)
