# Copyright 2024 Google LLC
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

import logging
import os
from typing import Tuple

from google.cloud import storage

GCS_PATH_PREFIX = "gs://"


def is_gcs_path(path: str) -> bool:
  return path.startswith(GCS_PATH_PREFIX) and len(path) > len(GCS_PATH_PREFIX)


def get_path_parts(gcs_path: str) -> Tuple[str, str]:
  if not is_gcs_path(gcs_path):
    raise ValueError(f"Invalid GCS path: {gcs_path}")
  return tuple(gcs_path.removeprefix(GCS_PATH_PREFIX).split('/', 1))


def download_blob(bucket_name: str,
                  blob_name: str,
                  local_path: str,
                  use_anonymous_client: bool = False):
  """
    Downloads the content of a GCS folder to a local folder.

    Args:
    - bucket_name: The name of the GCS bucket.
    - blob_name: The GCS blob name, could be a folder or a file.
    - local_path: The local path to download the blob to.
    """
  logging.info("Downloading %s/%s to %s", bucket_name, blob_name, local_path)
  if use_anonymous_client:
    storage_client = storage.Client.create_anonymous_client()
  else:
    storage_client = storage.Client()

  bucket = storage_client.bucket(bucket_name)
  blobs = bucket.list_blobs(prefix=blob_name)
  for blob in blobs:
    if blob.name.endswith("/"):
      continue
    # Get the relative path to the input blob. This is used to download folder.
    relative_path = os.path.relpath(blob.name, blob_name)
    if relative_path == ".":
      # In this case, the blob is a file.
      local_file_path = local_path
    else:
      # In this case, the blob is a folder.
      local_file_path = os.path.join(local_path, relative_path)
    # Create the directory if it doesn't exist.
    local_dir = os.path.dirname(local_file_path)
    if not os.path.exists(local_dir):
      os.makedirs(local_dir)
    # Download the file.
    blob.download_to_filename(local_file_path)


def download_blob_by_path(gcs_path: str,
                          local_path: str,
                          use_anonymous_client: bool = False):
  """Downloads file/folder given full GCS path (i.e. gs://bucket/path/to/file)
  to a local path.

  Args:
    gcs_path: The full GCS path (i.e. gs://bucket/path/to/file/).
    local_path: The local path to download the folder to.
  """
  if not is_gcs_path(gcs_path):
    raise ValueError(f"Invalid GCS path: {gcs_path}")
  bucket_name, blob_name = get_path_parts(gcs_path)
  return download_blob(bucket_name, blob_name, local_path, use_anonymous_client)


def maybe_download(gcs_path: str,
                   local_path_prefix='/tmp',
                   use_anonymous_client: bool = False) -> str:
  """Downloads file/folder given full GCS path (i.e. gs://bucket/path/to/file)
  to a local path. If the local file already exists, the do nothing.

  The local path expands the gcs_path pattern under local_path_prefix. For example,
  if local_path_prefix is '/tmp', the local path will be '/tmp/bucket/path/to/file'.

  Args:
    gcs_path: The full GCS path (i.e. gs://bucket/path/to/file/).
    local_path_prefix: The local path prefix to download the folder to.
    use_anonymous_client: Whether to use anonymous client to download the file.
  Returns:
    The local path of the downloaded file/folder.
  """
  if not is_gcs_path(gcs_path):
    raise ValueError(f"Invalid GCS path: {gcs_path}")
  bucket_name, blob_name = get_path_parts(gcs_path)
  local_path = os.path.join(local_path_prefix, bucket_name, blob_name)
  if not os.path.exists(local_path):
    download_blob_by_path(gcs_path, local_path, use_anonymous_client)
  return local_path
