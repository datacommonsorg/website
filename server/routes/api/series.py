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

from cache import cache
from flask import Blueprint
from flask import escape
from flask import request
from lib import util
import services.datacommons as dc

# Define blueprint
bp = Blueprint("series", __name__, url_prefix='/api/observations/series')

DEFAULT_LAST_MONTH = 12  # December ends the year

def compact_series(series_resp, all_facets):
  result = {
      'facets': series_resp.get('facets', {}),
  }
  data = {}
  for obs_by_variable in series_resp.get('observationsByVariable', []):
    var = obs_by_variable['variable']
    data[var] = {}
    for obs_by_entity in obs_by_variable['observationsByEntity']:
      entity = obs_by_entity['entity']
      data[var][entity] = None
      if 'seriesByFacet' in obs_by_entity:
        if all_facets:
          data[var][entity] = obs_by_entity['seriesByFacet']
        else:
          # There should be only one series
          data[var][entity] = obs_by_entity['seriesByFacet'][0]
      else:
        if all_facets:
          data[var][entity] = []
        else:
          data[var][entity] = {
              'series': [],
          }
  result['data'] = data
  return result


def series_core(entities, variables, all_facets):
  resp = dc.obs_series(entities, variables, all_facets)
  return compact_series(resp, all_facets)


def series_within_core(parent_entity, child_type, variables, all_facets):
  resp = dc.obs_series_within(parent_entity, child_type, variables, all_facets)
  return compact_series(resp, all_facets)





@bp.route('', strict_slashes=False)
@cache.cached(timeout=3600 * 24, query_string=True)
def series():
  """Handler to get preferred time series given multiple stat vars and entities."""
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  return util.series_core(entities, variables, False)


@bp.route('/all')
@cache.cached(timeout=3600 * 24, query_string=True)
def series_all():
  """Handler to get all the time series given multiple stat vars and places."""
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  return util.series_core(entities, variables, True)


@bp.route('/within')
@cache.cached(timeout=3600 * 24, query_string=True)
def series_within():
  """Gets the observation for child entities of a certain place
  type contained in a parent entity at a given date.

  Note: the preferred facet is returned.
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
  return util.series_within_core(parent_entity, child_type, variables, False)


@bp.route('/within/all')
@cache.cached(timeout=3600 * 24, query_string=True)
def series_within_all():
  """Gets the observation for child entities of a certain place
  type contained in a parent entity at a given date.

  Note: all the facets are returned.
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
  return util.series_within_core(parent_entity, child_type, variables, True)


