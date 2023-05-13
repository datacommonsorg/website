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

from server.cache import cache
from server.lib import fetch

# Define blueprint
bp = Blueprint("series", __name__, url_prefix='/api/observations/series')


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
  return fetch.series_core(entities, variables, False)


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
  return fetch.series_core(entities, variables, True)


@bp.route('/within')
@cache.cached(timeout=3600 * 24, query_string=True)
def series_within():
  """Gets the observation for child entities of a certain place
  type contained in a parent entity at a given date.
  Note: the perferred facet is returned.
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
  return fetch.series_within_core(parent_entity, child_type, variables, False)


@bp.route('/within/all')
@cache.cached(timeout=3600 * 24, query_string=True)
def series_within_all():
  """Gets the observation for child entities of a certain place
  type contained in a parent entity at a given date.
  Note: all the facets are returned.
  """
  parent_entity = request.args.get('parentEntity')
  if not parent_entity:
    return 'error: must provide a `parentEntity` field', 400
  child_type = request.args.get('child_type')
  if not child_type:
    return 'error: must provide a `childType` field', 400
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not variables:
    return 'error: must provide a `variables` field', 400
  return fetch.series_within_core(parent_entity, child_type, variables, True)
