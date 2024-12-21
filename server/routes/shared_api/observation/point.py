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


@bp.route('', strict_slashes=False)
@cache.cached(timeout=TIMEOUT, query_string=True)
def point():
  """Handler to get the observation point given multiple stat vars and places."""
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
                                  all_facets=False)
  # Fetch observations from a specific date or date = 'LATEST'
  return fetch.point_core(entities, variables, date, False)


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
