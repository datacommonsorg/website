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
from markupsafe import escape

from server.lib import fetch
from server.lib.cache import cache
from server.lib.cache import cache_and_log_mixer_usage
from server.lib.util import fetch_highest_coverage
from server.routes import TIMEOUT
from shared.lib.constants import DATE_HIGHEST_COVERAGE
from shared.lib.constants import DATE_LATEST
from shared.lib.constants import MIXER_RESPONSE_ID_FIELD

# Define blueprint
bp = Blueprint('point', __name__, url_prefix='/api/observations/point')


def _get_escaped_arg(name: str, default=None):
  value = request.args.get(name, default)
  if value is None:
    return None
  return str(escape(value))


def _get_escaped_arg_list(name: str) -> list[str]:
  return [str(escape(v)) for v in request.args.getlist(name)]


def _filter_point_for_facets(point_data, facet_ids: list[str]):
  """Filter the point data to only include the specified facets.
  Args:
    point_data: The point data to filter.
    facet_ids: The list of facet IDs to include in the filtered data.
  Returns:
    The filtered point data, including only the specified facets.
  """
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
    point_to_return = {
        'facets': final_facets_info,
        'data': filtered_data,
        'mixer_response_ids': point_data[MIXER_RESPONSE_ID_FIELD]
    }
    return point_to_return

  return point_data


@bp.route('', strict_slashes=False)
# Log the mixer response IDs used to populate the table.
# This allows the usage to be tracked in mixer usage logs because it is
# a meaningful use of mixer results that are shown to users.
@cache_and_log_mixer_usage(timeout=TIMEOUT, query_string=True)
def point():
  """Handler to get the observation point given multiple stat vars and places."""
  entities = list(filter(lambda x: x != "", _get_escaped_arg_list('entities')))
  variables = list(
      filter(lambda x: x != "", _get_escaped_arg_list('variables')))
  facet_id = list(filter(lambda x: x != "",
                         _get_escaped_arg_list('facetId'))) or None
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = _get_escaped_arg('date') or DATE_LATEST
  # Fetch recent observations with the highest entity coverage
  if date == DATE_HIGHEST_COVERAGE:
    return fetch_highest_coverage(entities=entities,
                                  variables=variables,
                                  all_facets=False,
                                  facet_ids=facet_id)

  # If facet_ids are provided, we need to filter the data after fetching
  # the point data. This is because the fetch.point_core function does not
  # support filtering by facet_ids directly.
  all_facets = True if facet_id else False
  point_data = fetch.point_core(entities, variables, date, all_facets)

  if not facet_id:
    return point_data

  return _filter_point_for_facets(point_data, facet_id)


@bp.route('/all')
# Log the mixer response IDs used to populate the table.
# This allows the usage to be tracked in mixer usage logs because it is
# a meaningful use of mixer results that are shown to users.
@cache_and_log_mixer_usage(timeout=TIMEOUT, query_string=True)
def point_all():
  """Handler to get all the observation points given multiple stat vars and entities."""
  entities = list(filter(lambda x: x != "", _get_escaped_arg_list('entities')))
  variables = list(
      filter(lambda x: x != "", _get_escaped_arg_list('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = _get_escaped_arg('date') or DATE_LATEST
  # Fetch recent observations with the highest entity coverage
  if date == DATE_HIGHEST_COVERAGE:
    return fetch_highest_coverage(entities=entities,
                                  variables=variables,
                                  all_facets=True)
  # Fetch observations from a specific date or date = 'LATEST'
  return fetch.point_core(entities, variables, date, True)


@bp.route('/within')
# Log the mixer response IDs used to populate the table.
# This allows the usage to be tracked in mixer usage logs because it is
# a meaningful use of mixer results that are shown to users.
@cache_and_log_mixer_usage(timeout=TIMEOUT, query_string=True)
def point_within():
  """Gets the observations for child entities of a certain place
  type contained in a parent entity at a given date. If no date given, will
  return values for most recent date.

  This returns the observation for the preferred facet.
  """
  parent_entity = _get_escaped_arg('parentEntity')
  if not parent_entity:
    return 'error: must provide a `parentEntity` field', 400
  child_type = _get_escaped_arg('childType')
  if not child_type:
    return 'error: must provide a `childType` field', 400
  variables = list(
      filter(lambda x: x != "", _get_escaped_arg_list('variables')))
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = _get_escaped_arg('date') or DATE_LATEST
  facet_ids = list(filter(lambda x: x != "", _get_escaped_arg_list('facetIds')))
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
# Log the mixer response IDs used to populate the table.
# This allows the usage to be tracked in mixer usage logs because it is
# a meaningful use of mixer results that are shown to users.
@cache_and_log_mixer_usage(timeout=TIMEOUT, query_string=True)
def point_within_all():
  """Gets the observations for child entities of a certain place
  type contained in a parent entity at a given date. If no date given, will
  return values for most recent date.

  This returns the observation for all facets.
  """
  parent_entity = _get_escaped_arg('parentEntity')
  if not parent_entity:
    return 'error: must provide a `parentEntity` field', 400
  child_type = _get_escaped_arg('childType')
  if not child_type:
    return 'error: must provide a `childType` field', 400
  variables = list(
      filter(lambda x: x != "", _get_escaped_arg_list('variables')))
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = _get_escaped_arg('date') or DATE_LATEST
  # Fetch recent observations with the highest entity coverage
  if date == DATE_HIGHEST_COVERAGE:
    return fetch_highest_coverage(parent_entity=parent_entity,
                                  child_type=child_type,
                                  variables=variables,
                                  all_facets=True)
  # Fetch observations from a specific date or date = 'LATEST'
  return fetch.point_within_core(parent_entity, child_type, variables, date,
                                 True)
