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

from flask import Blueprint, request
from cache import cache
import services.datacommons as dc
# Define blueprint
bp = Blueprint('point', __name__, url_prefix='/api/observations/point')


def compact_point(point_resp, all_facets):
  result = {
      'facets': point_resp.get('facets', {}),
  }
  data = {}
  for obs_by_variable in point_resp.get('observationsByVariable', []):
    var = obs_by_variable['variable']
    data[var] = {}
    for obs_by_entity in obs_by_variable['observationsByEntity']:
      entity = obs_by_entity['entity']
      data[var][entity] = None
      if 'pointsByFacet' in obs_by_entity:
        if all_facets:
          data[var][entity] = obs_by_entity['pointsByFacet']
        else:
          # There should be only one point.
          data[var][entity] = obs_by_entity['pointsByFacet'][0]
      else:
        if all_facets:
          data[var][entity] = []
        else:
          data[var][entity] = {}
  result['data'] = data
  return result


def point_core(entities, variables, date, all_facets):
  resp = dc.obs_point(entities, variables, date, all_facets)
  return compact_point(resp, all_facets)


def point_within_core(parent_entity, child_type, variables, date, all_facets):
  resp = dc.obs_point_within(parent_entity, child_type, variables, date,
                             all_facets)
  return compact_point(resp, all_facets)


@bp.route('', strict_slashes=False)
@cache.cached(timeout=3600 * 24, query_string=True)
def point():
  """Handler to get the observation point given multiple stat vars and places."""
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = request.args.get('date', '')
  return point_core(entities, variables, date, False)


@bp.route('/all')
@cache.cached(timeout=3600 * 24, query_string=True)
def point_all():
  """Handler to get all the observation points given multiple stat vars and entities."""
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = request.args.get('date', '')
  return point_core(entities, variables, date, True)


@bp.route('/within')
@cache.cached(timeout=3600 * 24, query_string=True)
def point_within():
  """Gets the observations for child entities of a certain place
  type contained in a parent entity at a given date. If no date given, will
  return values for most recent date.

  This returns the observation for the preferred facet.
  """
  parent_entity = request.args.get('parent_entity')
  if not parent_entity:
    return 'error: must provide a `parent_entity` field', 400
  child_type = request.args.get('child_type')
  if not child_type:
    return 'error: must provide a `child_type` field', 400
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = request.args.get('date', '')
  return point_within_core(parent_entity, child_type, variables, date, False)


@bp.route('/within/all')
@cache.cached(timeout=3600 * 24, query_string=True)
def point_within_all():
  """Gets the observations for child entities of a certain place
  type contained in a parent entity at a given date. If no date given, will
  return values for most recent date.

  This returns the observation for all facets.
  """
  parent_entity = request.args.get('parent_entity')
  if not parent_entity:
    return 'error: must provide a `parent_entity` field', 400
  child_type = request.args.get('child_type')
  if not child_type:
    return 'error: must provide a `child_type` field', 400
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not variables:
    return 'error: must provide a `variables` field', 400
  date = request.args.get('date', '')
  return point_within_core(parent_entity, child_type, variables, date, True)
