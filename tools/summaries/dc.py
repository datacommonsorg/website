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
      dcids: A list of place dcids.

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


def get_ranking_by_var(stat_var_dcid: str, place_type: str,
                       parent_place_dcid: str) -> List:
  """Get rankings of child places in a parent place by a stat var
  
  Args:
    stat_var_dcid: dcid of the stat var to get rankings for
    place_type: place type of the places to rank
    parent_place_dcid: dcid of the parent place of all places to rank
  
  Returns:
    A list of { place_name, rank, value } keyed dictionaries, sorted in
    ascending rank.
  """
  req_url = f"https://datacommons.org/api/ranking/{stat_var_dcid}/{place_type}/{parent_place_dcid}"
  response = requests.get(req_url)
  # Extract just the nested ranking list from the response
  if response.status_code == 200:
    response_data = response.json().get(stat_var_dcid, {})
    ranking_key = list(response_data.keys())[0] if response_data.keys() else ""
    rank_list = response_data.get(ranking_key, {}).get("info", [])
    if rank_list:
      rank_list.sort(key=lambda x: x['rank'])
    return rank_list
  else:
    logging.error(f"unable to fetch ranking from {req_url}")
  return {}


def get_names(place_dcids: List[str]) -> Dict:
  """Get mapping of place dcid -> name"""
  req_url = f"https://api.datacommons.org/v1/bulk/property/values/out?property=name&key={_API_KEY}&nodes="
  req_url += "&nodes=".join(place_dcids)
  response = requests.get(req_url)
  if response.status_code == 200:
    # Format response into dcid -> name dictionary
    names = {}
    res_data = response.json().get("data", [])
    for place in res_data:
      place_dcid = place.get("node")
      place_name_values = place.get("values")
      place_name = place_name_values[0].get("value",
                                            "") if place_name_values else None
      if place_dcid and place_name:
        names[place_dcid] = place_name
    return names
  else:
    logging.error(f"unable to fetch names from {req_url}")
  return {}


def get_child_places(place_type: str, parent_place_dcid: str) -> List[str]:
  """Get list of dcids for all places in a parent place of a certain place type"""
  req_url = f"https://api.datacommons.org/v1/property/values/in/linked/{parent_place_dcid}/containedInPlace?value_node_type={place_type}&key={_API_KEY}"
  response = requests.get(req_url)
  if response.status_code == 200:
    # Format response into a list of dcids
    child_place_list = response.json().get("values", [])
    all_places_in = []
    for place in child_place_list:
      if place.get("dcid"):
        all_places_in.append(place.get("dcid"))
    return all_places_in
  else:
    logging.error(f"unable to child places from {req_url}")
  return []
