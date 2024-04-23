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

import logging
import os
from pathlib import Path

from google.cloud import storage

_GCS_PATH_PREFIX = "gs://"


def is_gcs_path(path: str) -> bool:
  return path.strip().startswith(_GCS_PATH_PREFIX)


def join_gcs_path(base_path: str, sub_path: str) -> str:
  if base_path.endswith('/'):
    return f'{base_path}{sub_path}'
  return f'{base_path}/{sub_path}'


def get_gcs_parts(gcs_path: str) -> tuple[str, str]:
  return gcs_path[len(_GCS_PATH_PREFIX):].split('/', 1)


def download_gcs_file(gcs_path: str, use_anonymous_client: bool = False) -> str:
  """Downloads the file from the full GCS path (i.e. gs://bucket/path/to/file) 
  to a local path and returns the latter.
  """
  # If not a GCS path, return the path itself.
  if not is_gcs_path(gcs_path):
    return gcs_path

  bucket_name, blob_name = get_gcs_parts(gcs_path)
  if not blob_name:
    return ''
  try:
    return get_or_download_file(bucket_name, blob_name, use_anonymous_client)
  except Exception as e:
    logging.warning("Unable to download gcs file: %s (%s)", gcs_path, str(e))
    return ''


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
  bucket_object = storage_client.bucket(bucket_name=bucket)
  blob = bucket_object.get_blob(filename)
  # Download
  local_file_path = _get_local_path(bucket, filename)
  # Create directory to file if it does not exist.
  parent_dir = Path(local_file_path).parent
  if not parent_dir.exists():
    parent_dir.mkdir(parents=True, exist_ok=True)
  blob.download_to_filename(local_file_path)
  return local_file_path


def get_or_download_file(bucket: str,
                         filename: str,
                         use_anonymous_client: bool = False) -> str:
  """Returns the local file path if the file already exists. 
  Otherwise it downloads the file from GCS and returns the path it was downloaded to.
  """
  local_file_path = _get_local_path(bucket, filename)
  if os.path.exists(local_file_path):
    logging.info("Using already downloaded GCS file: %s", local_file_path)
    return local_file_path
  return download_file(bucket, filename, use_anonymous_client)


def _get_local_path(bucketname: str, filename: str) -> str:
  return os.path.join(TEMP_DIR, bucketname, filename)
