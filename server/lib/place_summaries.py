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
"""Helper functions for getting place summary data for the app config"""

import json

from server.lib.config import GLOBAL_CONFIG_BUCKET
from shared.lib import gcs

# Filename in GCS storing allow list of places to show summaries for
_PLACE_SUMMARY_ALLOWLIST_FILENAME = "place_summary_config.json"
_PLACE_SUMMARY_CONTENT_FILENAME = "place_summary_content.json"


def get_place_allowlist() -> list:
  """Load allow list places to show summaries for from GCS"""
  places_config_file = gcs.download_file(GLOBAL_CONFIG_BUCKET,
                                         _PLACE_SUMMARY_ALLOWLIST_FILENAME)
  with open(places_config_file) as f:
    places_config = json.load(f) or {}
    return places_config.get("allow_list", [])


def get_place_summaries() -> dict:
  """Load place summary content from GCS"""
  places_config_file = gcs.download_file(GLOBAL_CONFIG_BUCKET,
                                         _PLACE_SUMMARY_CONTENT_FILENAME)
  with open(places_config_file) as f:
    return json.load(f) or {}
