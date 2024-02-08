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
"""Utility functions for place page summaries"""

import json
import os

from flask import current_app

PLACE_SUMMARY_DIR = "/datacommons/place-summary/"

# Prefixes to use as the groupings for sharding
SHARD_DCID_PREFIXES = ["geoId/", "country/"
                       "wikidataId/"]

# Filename format of sharded json file containing place summaries
SHARD_FILENAME = "place_summaries_for_{shard}.json"

# Filename for summary json for DCIDs that don't match any other shard
DEFAULT_FILENAME = "place_summaries_others.json"


def get_shard_prefix(dcid: str) -> str:
  """Return shard prefix the given DCID matches to, or '' if no match"""
  for prefix in SHARD_DCID_PREFIXES:
    if dcid.startswith(prefix):
      return prefix
  return ''


def get_shard_filename_by_prefix(prefix: str) -> str:
  """Get the filename for a place summary json given a DCID prefix"""
  if prefix in SHARD_DCID_PREFIXES:
    return SHARD_FILENAME.format(shard=prefix.replace('/', '-'))
  else:
    return DEFAULT_FILENAME


def get_shard_filename_by_dcid(dcid: str) -> str:
  """Get the filename of the shard containing the summary for a given DCID"""
  prefix = get_shard_prefix(dcid)
  if prefix:
    return get_shard_filename_by_prefix(prefix)
  return DEFAULT_FILENAME


def get_place_summaries(dcid: str) -> dict:
  """Load place summary content from disk containing summary for a given dcid"""
  # When deployed in GKE, the config is a config mounted as volume. Check this
  # first.
  filename = get_shard_filename_by_dcid(dcid)
  filepath = os.path.join(PLACE_SUMMARY_DIR, filename)
  if os.path.isfile(filepath):
    with open(filepath) as f:
      return json.load(f)
  # If no mounted config file, use the config that is in the code base.
  local_path = os.path.join(current_app.root_path,
                            f'config/summaries/{filename}')
  with open(local_path) as f:
    return json.load(f)
