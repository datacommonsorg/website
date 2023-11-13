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

import json
import logging
import os
from typing import Dict, List

from absl import flags
import requests

FLAGS = flags.FLAGS

flags.DEFINE_string('dc_base_url', 'https://api.datacommons.org',
                    'Mixer instance to query')

_WANTED_PARENT_TYPES = ["County", "State", "Country"]

_API_KEY = os.getenv("MIXER_API_KEY")
assert _API_KEY, "$MIXER_API_KEY must be specified."


def get_service_url(path):
  return FLAGS.dc_base_url + path


def post_wrapper(url, req_str: str):
  req = json.loads(req_str)
  headers = {'Content-Type': 'application/json'}
  headers['x-api-key'] = _API_KEY
  # Send the request and verify the request succeeded
  logging.debug(f'{url} {req}')
  response = requests.post(url, json=req, headers=headers)
  if response.status_code != 200:
    raise ValueError(
        'An HTTP {} code ({}) was returned by the mixer: "{}"'.format(
            response.status_code, response.reason, response.content))
  return response.json()


def post(url: str, req: Dict):
  req_str = json.dumps(req, sort_keys=True)
  return post_wrapper(url, req_str)


def get_place_info(dcids: List[str]) -> Dict:
  """Retrieves Place Info given a list of DCIDs."""
  url = get_service_url("/v1/bulk/info/place")
  return post(url, {
      'nodes': sorted(set(dcids)),
  })


def get_parent_places(dcids):
  """Get the parent place chain for a list of places.

  Args:
      dcids: A list of place dids.

  Returns:
      A dictionary of lists of containedInPlace, keyed by dcid.
  """
  result = {dcid: {} for dcid in dcids}
  place_info = get_place_info(dcids)
  for item in place_info.get('data', []):
    if 'node' not in item or 'info' not in item:
      continue
    dcid = item['node']
    parents = item['info'].get('parents', [])
    parents = [
        x for x in parents
        if ('type' in x and x['type'] in _WANTED_PARENT_TYPES)
    ]
    result[dcid] = parents
  return result


def get_place_rankings(dcid, variables, ancestor=None, per_capita=False):
  """Returns rankings for a list of SVs, for a single DCID and ancestor pair."""
  url = get_service_url("/v1/place/related")
  req_json = {'dcid': dcid, 'stat_var_dcids': sorted(variables)}
  if ancestor:
    req_json['within_place'] = ancestor
  if per_capita:
    req_json['is_per_capita'] = per_capita
  return post(url, req_json)


def get_landing_page_data(dcid):
  """Returns the landing page cache for the Overview page"""
  req = {'node': dcid, 'category': 'Overview'}
  url = get_service_url('/v1/internal/page/place')
  return post(url, req)


def get_ranking_data(dcid: str, sv_list):
  """Returns ranking data as a list, keyed by rank label"""
  parents = get_parent_places([dcid])[dcid]

  rankings = {}
  rankings['parents'] = parents
  for parent in parents:
    parent_dcid = parent['dcid']
    parent_rankings = get_place_rankings(dcid, sv_list, parent_dcid)
    rankings[parent_dcid] = parent_rankings

  logging.debug("Ranking response:\n%s", json.dumps(rankings, indent=True))
  return rankings


def get_data_series(dcid: str, sv_list):
  """Returns series data as a CSV keyed by stat var"""
  response = get_landing_page_data(dcid)
  sv_series = response.get("statVarSeries", {}).get(dcid, {}).get('data', {})

  data = {}
  for sv in sv_list:
    series = sv_series.get(sv, None)
    if series:
      data[sv] = series

  return data
