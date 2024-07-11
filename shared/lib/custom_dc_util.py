# copyright 2024 google llc
#
# licensed under the apache license, version 2.0 (the "license");
# you may not use this file except in compliance with the license.
# you may obtain a copy of the license at
#
#      http://www.apache.org/licenses/license-2.0
#
# unless required by applicable law or agreed to in writing, software
# distributed under the license is distributed on an "as is" basis,
# without warranties or conditions of any kind, either express or implied.
# see the license for the specific language governing permissions and
# limitations under the license.
"""Custom DC utility functions shared by both server and NL server.
Any logic added here should be safely callable by both servers."""

import os

from shared.lib.gcs import is_gcs_path

_TOPIC_CACHE_PATH = "datacommons/nl/custom_dc_topic_cache.json"
_CUSTOM_CATALOG_PATH = "datacommons/nl/embeddings/custom_catalog.yaml"


def is_custom_dc() -> bool:
  return os.environ.get('IS_CUSTOM_DC', '').lower() == 'true'


# The path comes from:
# https://github.com/datacommonsorg/website/blob/master/server/routes/admin/html.py#L39-L40
def get_custom_dc_user_data_path() -> str:
  return os.environ.get('USER_DATA_PATH', '')


def get_custom_dc_topic_cache_path() -> str:
  base_path = get_custom_dc_user_data_path()
  if not base_path:
    return base_path
  return os.path.join(base_path, _TOPIC_CACHE_PATH)


def get_custom_catalog_path() -> str:
  base_path = get_custom_dc_user_data_path()
  if not base_path:
    return base_path
  return os.path.join(base_path, _CUSTOM_CATALOG_PATH)


def is_gcs_custom_dc_user_data_path() -> bool:
  path = get_custom_dc_user_data_path()
  return path and is_gcs_path(path)


# Returns true if anonymous GCS client should be used for downloading embeddings.
# An anonymous client should only be used for custom DCs but not when user data
# itself is in GCS.
def use_anonymous_gcs_client() -> bool:
  return is_custom_dc() and not is_gcs_custom_dc_user_data_path()
