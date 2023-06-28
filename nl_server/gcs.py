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

from tools.nl.embeddings import utils as embeddings_utils


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


def local_folder() -> str:
  return TEMP_DIR


def local_path(embeddings_file: str) -> str:
  return os.path.join(local_folder(), embeddings_file)


# Downloads the `model_folder` from GCS to `directory`
# and return its path.
def download_model_folder(directory: str, model_folder: str) -> str:
  sc = storage.Client()
  bucket = sc.bucket(bucket_name=BUCKET)
  ctx = embeddings_utils.Context(gs=None,
                                 model=None,
                                 bucket=bucket,
                                 tmp=directory)

  # Only download if needed.
  if os.path.exists(os.path.join(directory, model_folder)):
    return os.path.join(directory, model_folder)

  print(
      f"Model ({model_folder}) was not previously downloaded. Downloading to: {os.path.join(directory, model_folder)}"
  )
  return embeddings_utils.download_model_from_gcs(ctx, model_folder)
