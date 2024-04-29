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

import os
from pathlib import Path
from typing import Any

from google.cloud import storage

from shared.lib import gcs as gcs_lib


def download_embeddings(embeddings_filename: str) -> str:
  # Using use_anonymous_client = True because
  # Custom DCs need to download models without DC creds.
  return gcs_lib.get_or_download_file(bucket=BUCKET,
                                      filename=embeddings_filename,
                                      use_anonymous_client=True)


def local_path(embeddings_file: str) -> str:
  return os.path.join(gcs_lib.TEMP_DIR, embeddings_file)


def download_folder_from_gcs(gcs_bucket: Any, local_dir: str,
                             folder_name: str) -> str:
  """Downloads a folder from GCS.

  Args:
    gcs_bucket: The GCS bucket.
    local_dir: the local folder to download to.
    folder_name: the GCS folder name for the model.
  
  Returns the path to the local directory where the folder was downloaded to.
  """
  # Get list of files
  blobs = gcs_bucket.list_blobs(prefix=folder_name)
  for blob in blobs:
    file_split = blob.name.split("/")
    directory = local_dir
    for p in file_split[0:-1]:
      directory = os.path.join(directory, p)
    Path(directory).mkdir(parents=True, exist_ok=True)

    if blob.name.endswith("/"):
      continue
    blob.download_to_filename(os.path.join(directory, file_split[-1]))

  return os.path.join(local_dir, folder_name)


# Downloads the `folder` or gs:// path from GCS to /tmp/
# and return its path.
def download_folder(path: str) -> str:
  # Using an anonymous client because
  # Custom DCs need to download models without DC creds.
  sc = storage.Client.create_anonymous_client()

  if gcs_lib.is_gcs_path(path):
    bucket_name, base_name = gcs_lib.get_gcs_parts(path)
  else:
    bucket_name = BUCKET
    base_name = path
  local_dir_prefix = os.path.join(gcs_lib.TEMP_DIR, bucket_name)

  # Only download if needed.
  local_path = os.path.join(local_dir_prefix, base_name)
  if os.path.exists(local_path) and len(os.listdir(local_path)) > 0:
    # When running locally, we may already have downloaded the path.
    # But sometimes after restart, the directories in `/tmp` become
    # empty, so ensure that's not the case.
    return local_path

  print(
      f"Directory ({base_name}) was either not previously downloaded or cannot successfully be loaded. Downloading to: {local_path}"
  )
  bucket = sc.bucket(bucket_name=bucket_name)
  return download_folder_from_gcs(bucket, local_dir_prefix, base_name)
