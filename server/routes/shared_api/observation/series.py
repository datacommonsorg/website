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
from typing import List

from flask import Blueprint
from flask import request

from server.lib import fetch
from server.lib import shared
from server.lib.cache import cache
import server.lib.util as lib_util
from server.routes import TIMEOUT

# Maximum number of concurrent series the server will fetch
_MAX_BATCH_SIZE = 2000

# Maps enclosed place type -> places with too many of the enclosed type
# Determines when to make batched API calls to avoid server errors.
_BATCHED_CALL_PLACES = {
    "CensusTract": [
        "geoId/06",  # California
        "geoId/12",  # Florida
        "geoId/36",  # New York (State)
        "geoId/48",  # Texas
    ],
    "City": ["country/USA"],
    "County": ["country/USA"]
}

# Define blueprint
bp = Blueprint("series", __name__, url_prefix='/api/observations/series')


# Filters a list for non empty values
# TODO: use request directly in this function and pass in arg name
def _get_filtered_arg_list(arg_list: List[str]) -> List[str]:
  return list(filter(lambda x: x != "", arg_list))


@bp.route('', strict_slashes=False, methods=['GET', 'POST'])
@cache.cached(timeout=TIMEOUT,
              query_string=True,
              make_cache_key=lib_util.post_body_cache_key)
def series():
  """Handler to get preferred time series given multiple stat vars and entities."""
  if request.method == 'POST':
    entities = request.json.get('entities')
    variables = request.json.get('variables')
    facet_ids = request.json.get('facetIds')
  else:
    entities = _get_filtered_arg_list(request.args.getlist('entities'))
    variables = _get_filtered_arg_list(request.args.getlist('variables'))
    facet_ids = _get_filtered_arg_list(request.args.getlist('facetIds'))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  return fetch.series_core(entities, variables, False, facet_ids)


@bp.route('/all')
@cache.cached(timeout=TIMEOUT, query_string=True)
def series_all():
  """Handler to get all the time series given multiple stat vars and places."""
  entities = _get_filtered_arg_list(request.args.getlist('entities'))
  variables = _get_filtered_arg_list(request.args.getlist('variables'))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  return fetch.series_core(entities, variables, True)


@bp.route('/within')
@cache.cached(timeout=TIMEOUT, query_string=True)
def series_within():
  """Gets the observation for child entities of a certain type contained in a
  parent entity at a given date.

  Note: the preferred facet is returned.
  """
  parent_entity = request.args.get('parentEntity')
  if not parent_entity:
    return 'error: must provide a `parentEntity` field', 400

  child_type = request.args.get('childType')
  if not child_type:
    return 'error: must provide a `childType` field', 400

  variables = _get_filtered_arg_list(request.args.getlist('variables'))
  if not variables:
    return 'error: must provide a `variables` field', 400

  facet_ids = _get_filtered_arg_list(request.args.getlist('facetIds'))

  # Make batched calls there are too many child places for server to handle
  # Mixer checks num_places * num_variables and stop processing if the number is
  # too large. So the batch_size takes into account the number of variables.
  batch_size = _MAX_BATCH_SIZE // len(variables)
  if parent_entity in _BATCHED_CALL_PLACES.get(child_type, []):
    try:
      logging.info("Fetching child places series in batches")
      child_places = fetch.descendent_places([parent_entity],
                                             child_type).get(parent_entity, [])
      merged_response = {}
      for batch in shared.divide_into_batches(child_places, batch_size):
        new_response = fetch.series_core(batch, variables, False, facet_ids)
        merged_response = shared.merge_responses(merged_response, new_response)
      return merged_response, 200
    except Exception as e:
      logging.error(e)
      return 'error: Error encountered when attempting to make batch calls', 400
  return fetch.series_within_core(parent_entity, child_type, variables, False,
                                  facet_ids)


@bp.route('/within/all')
@cache.cached(timeout=TIMEOUT, query_string=True)
def series_within_all():
  """Gets the observation for child entities of a certain type contained in a
  parent entity at a given date.

  Note: all the facets are returned.
  """
  parent_entity = request.args.get('parentEntity')
  if not parent_entity:
    return 'error: must provide a `parentEntity` field', 400

  child_type = request.args.get('childType')
  if not child_type:
    return 'error: must provide a `childType` field', 400

  variables = _get_filtered_arg_list(request.args.getlist('variables'))
  if not variables:
    return 'error: must provide a `variables` field', 400

  return fetch.series_within_core(parent_entity, child_type, variables, True)
