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

import re

from flask import Blueprint
from flask import request

from server.lib import fetch

bp = Blueprint("facets", __name__, url_prefix='/api/facets')


def is_valid_date(date):
  """
  Returns whether or not the date string is valid. Valid date strings are:
      1. empty or
      2. "LATEST" or
      3. of the form "YYYY" or "YYYY-MM" or "YYYY-MM-DD"
  """
  return (date == '' or date == 'LATEST' or
          re.match(r"^(\d\d\d\d)(-\d\d)?(-\d\d)?$", date))


@bp.route('/within')
def get_facets_within():
  """Gets the available facets for a list of stat vars for places of a specific
    type within a parent place. If minDate and maxDate are "latest",
    the latest date facets will be returned.

  Request body:
      parentEntity: the parent place of the places to get facets for
      childType: type of places to get facets for
      variables: list of statistical variables to get facets for
      date: If empty, fetch for all date; Otherwise could be "LATEST" or
        specific date.
  """
  parent_entity = request.args.get('parentEntity')
  if not parent_entity:
    return 'error: must provide a parentEntity field', 400
  child_type = request.args.get('childType')
  if not child_type:
    return 'error: must provide a childType field', 400
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not variables:
    return 'error: must provide a variables field', 400
  date = request.args.get('date')
  if not is_valid_date(date):
    return 'error: date must be LATEST or YYYY or YYYY-MM or YYYY-MM-DD', 400
  return fetch.point_within_facet(parent_entity, child_type, variables, date,
                                  True)


@bp.route('/', strict_slashes=False)
def get_facets():
  """Gets the available facets for a list of stat vars for a list of places.
  """
  entities = list(filter(lambda x: x != "", request.args.getlist('entities')))
  variables = list(filter(lambda x: x != "", request.args.getlist('variables')))
  if not entities:
    return 'error: must provide a `entities` field', 400
  if not variables:
    return 'error: must provide a `variables` field', 400
  return fetch.series_facet(entities, variables, True)
