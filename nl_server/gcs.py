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
from pathlib import Path
from typing import Any

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


def download_model_from_gcs(gcs_bucket: Any, local_dir: str,
                            model_folder_name: str) -> str:
  """Downloads a Sentence Tranformer model (or finetuned version) from GCS.

  Args:
    gcs_bucket: The GCS bucket.
    local_dir: the local folder to download to.
    model_folder_name: the GCS bucket name for the model.
  
  Returns the path to the local directory where the model was downloaded to.
  The downloaded model can then be loaded as:

  ```
      downloaded_model_path = download_model_from_gcs(bucket, dir, gcs_model_folder_name)
      model = SentenceTransformer(downloaded_model_path)
  ```
  """
  # Get list of files
  blobs = gcs_bucket.list_blobs(prefix=model_folder_name)
  for blob in blobs:
    file_split = blob.name.split("/")
    directory = local_dir
    for p in file_split[0:-1]:
      directory = os.path.join(directory, p)
    Path(directory).mkdir(parents=True, exist_ok=True)

    if blob.name.endswith("/"):
      continue
    blob.download_to_filename(os.path.join(directory, file_split[-1]))

  return os.path.join(local_dir, model_folder_name)


# Downloads the `model_folder` from GCS to /tmp/
# and return its path.
def download_model_folder(model_folder: str) -> str:
  sc = storage.Client()
  bucket = sc.bucket(bucket_name=BUCKET)
  directory = TEMP_DIR

  # Only download if needed.
  local_folderpath = os.path.join(directory, model_folder)
  if os.path.exists(local_folderpath):
    print(f"Model ({model_folder}) already downloaded. Returning the local path: {local_folderpath}")
    return local_folderpath

  print(
      f"Model ({model_folder}) was not previously downloaded. Downloading to: {os.path.join(directory, model_folder)}"
  )
  return download_model_from_gcs(bucket, directory, model_folder)
