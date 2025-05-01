# Copyright 2022 Google LLC
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

from flask import Blueprint
from flask import request

from server.lib import fetch
from server.lib.cache import cache
from server.lib.util import fetch_highest_coverage
from server.routes import TIMEOUT
from shared.lib.constants import DATE_HIGHEST_COVERAGE
from shared.lib.constants import DATE_LATEST

# Define blueprint
bp = Blueprint('point', __name__, url_prefix='/api/observations/point')


def _filter_point_for_facets(point_data, facet_ids):
  if not point_data or not point_data.get('data') or not point_data.get(
      'facets'):
    return point_data

  # Filter the data based on the provided facet_ids
  if 'data' in point_data:
    filtered_data = {}
    for stat_var, entity_data in point_data['data'].items():
      filtered_data[stat_var] = {}
      for entity_id, observations in entity_data.items():
        filtered_data[stat_var][entity_id] = [
            obs for obs in observations if obs.get('facet') in facet_ids
        ]

    # Remove empty entries from filtered_data
    filtered_data = {
        stat_var: {
            entity_id: observations
            for entity_id, observations in entity_data.items()
            if observations
        } for stat_var, entity_data in filtered_data.items() if entity_data
    }

    # Determine which facets are actually present in the filtered_data
    active_facets_in_filtered_data = set()
    for _, entity_data_val in filtered_data.items():
      for _, observations_val in entity_data_val.items():
        for obs in observations_val:
          active_facets_in_filtered_data.add(obs.get('facet'))

    final_facets_info = {
        f_id: point_data['facets'][f_id]
        for f_id in active_facets_in_filtered_data
        if f_id in point_data.get('facets', {})
    }
    point_to_return = {'facets': final_facets_info, 'data': filtered_data}
    return point_to_return

  return point_data


@bp.route('', strict_slashes=False)
@cache.cached(timeout=TIMEOUT, query_string=True)
def point():
  """Handler to get the observation point given multiple stat vars and places."""
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  facet_ids = list(filter(lambda x: x != "", request.args.getlist('facetIds')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = request.args.get('date') or DATE_LATEST
  # Fetch recent observations with the highest entity coverage
  if date == DATE_HIGHEST_COVERAGE:
    return fetch_highest_coverage(entities=entities,
                                  variables=variables,
                                  all_facets=False,
                                  facet_ids=facet_ids)

  # If facet_ids are provided, we need to filter the data after fetching
  # the point data. This is because the fetch.point_core function does not
  # support filtering by facet_ids directly.
  all_facets = True if facet_ids else False
  point_data = fetch.point_core(entities, variables, date, all_facets)

  if not facet_ids:
    return point_data

  return _filter_point_for_facets(point_data, facet_ids)


@bp.route('/all')
@cache.cached(timeout=TIMEOUT, query_string=True)
def point_all():
  """Handler to get all the observation points given multiple stat vars and entities."""
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = request.args.get('date') or DATE_LATEST
  # Fetch recent observations with the highest entity coverage
  if date == DATE_HIGHEST_COVERAGE:
    return fetch_highest_coverage(entities=entities,
                                  variables=variables,
                                  all_facets=True)
  # Fetch observations from a specific date or date = 'LATEST'
  return fetch.point_core(entities, variables, date, True)


@bp.route('/within')
@cache.cached(timeout=TIMEOUT, query_string=True)
def point_within():
  """Gets the observations for child entities of a certain place
  type contained in a parent entity at a given date. If no date given, will
  return values for most recent date.

  This returns the observation for the preferred facet.
  """
  parent_entity = request.args.get('parentEntity')
  if not parent_entity:
    return 'error: must provide a `parentEntity` field', 400
  child_type = request.args.get('childType')
  if not child_type:
    return 'error: must provide a `childType` field', 400
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = request.args.get('date') or DATE_LATEST
  facet_ids = list(filter(lambda x: x != "", request.args.getlist('facetIds')))
  # Fetch recent observations with the highest entity coverage
  if date == DATE_HIGHEST_COVERAGE:
    return fetch_highest_coverage(parent_entity=parent_entity,
                                  child_type=child_type,
                                  variables=variables,
                                  all_facets=False,
                                  facet_ids=facet_ids)
  # Fetch observations from a specific date or date = 'LATEST'
  return fetch.point_within_core(parent_entity, child_type, variables, date,
                                 False, facet_ids)


@bp.route('/within/all')
@cache.cached(timeout=TIMEOUT, query_string=True)
def point_within_all():
  """Gets the observations for child entities of a certain place
  type contained in a parent entity at a given date. If no date given, will
  return values for most recent date.

  This returns the observation for all facets.
  """
  parent_entity = request.args.get('parentEntity')
  if not parent_entity:
    return 'error: must provide a `parentEntity` field', 400
  child_type = request.args.get('childType')
  if not child_type:
    return 'error: must provide a `childType` field', 400
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = request.args.get('date') or DATE_LATEST
  # Fetch recent observations with the highest entity coverage
  if date == DATE_HIGHEST_COVERAGE:
    return fetch_highest_coverage(parent_entity=parent_entity,
                                  child_type=child_type,
                                  variables=variables,
                                  all_facets=True)
  # Fetch observations from a specific date or date = 'LATEST'
  return fetch.point_within_core(parent_entity, child_type, variables, date,
                                 True)
