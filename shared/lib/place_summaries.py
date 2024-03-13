# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Place summary config sharding functions shared by tools and server"""

import re

# Regex rules on DCIDs to use as the groupings for sharding
SHARD_DCID_REGEX = [
    "geoId/[0-2]",
    "geoId/[3-5]",
    "geoId/[6-9]",
    "country/",
    "wikidataId/",
]

# Filename format of sharded json file containing place summaries
SHARD_FILENAME = "place_summaries_for_{shard}.json"

# Filename for summary json for DCIDs that don't match any other shard
DEFAULT_FILENAME = "place_summaries_others.json"


def sanitize_regex(regex: str) -> str:
  """Convert a regex string to a filename friendly string"""
  return regex.replace('/', '_').replace('[', '').replace(']', '')


def get_shard_name(dcid: str) -> str:
  """Get the name of the shard the given DCID matches to, or '' if no match"""
  for regex in SHARD_DCID_REGEX:
    if re.match(regex, dcid):
      return sanitize_regex(regex)
  return ''


def get_shard_filename_by_dcid(dcid: str) -> str:
  """Get the filename of the shard containing the summary for a given DCID"""
  shard_name = get_shard_name(dcid)
  if shard_name:
    return SHARD_FILENAME.format(shard=shard_name)
  return DEFAULT_FILENAME
