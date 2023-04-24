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

import server.services.datacommons as dc

bp = Blueprint("facets", __name__, url_prefix='/api/facets')


def get_variable_facets_from_series(series_response):
  """Gets the available facets for each sv in an api response for series_within.

  Args:
      series_response: the response from a dc.obs_series_within call.

  Returns:
      a dict of sv to dict of facet id to facet information:
          {
              [sv]: {
                  [facet1]: {
                      "importName": "Census",
                      "observationPeriod": "P1Y",
                      ...
                  },
                  ...
              },
              ...
          }
  """
  facets_by_variable = {}
  facets = series_response.get("facets", {})
  for var_obs in series_response.get("observationsByVariable", []):
    sv = var_obs.get("variable")
    facets_by_variable[sv] = {}
    for place_obs in var_obs.get("observationsByEntity", []):
      for facet_obs in place_obs.get("seriesByFacet", []):
        facet_id = facet_obs.get("facet", "")
        if facet_id and facet_id not in facets_by_variable[sv]:
          facets_by_variable[sv][facet_id] = facets.get(facet_id, {})
  return facets_by_variable


def get_variable_facets_from_points(point_response):
  """Gets the available facets for each sv in an api response for obs_point_within.

  Args:
      points_response: the response from a dc.obs_point_within call.

  Returns:
      a dict of sv to dict of facet id to facet information:
          {
              [sv]: {
                  [facet1]: {
                      "importName": "Census",
                      "observationPeriod": "P1Y",
                      ...
                  },
                  ...
              },
              ...
          }
  """
  facets_by_variable = {}
  facets = point_response.get("facets", {})
  for sv, var_obs in point_response.get("byVariable", {}).items():
    facets_by_variable[sv] = {}
    for _, entity_obs in var_obs.get("byEntity", {}).items():
      for facet_obs in entity_obs.get("orderedFacets", []):
        facet_id = facet_obs.get("facetId", "")
        if facet_id not in facets_by_variable[sv]:
          facets_by_variable[sv][facet_id] = facets.get(facet_id, {})
  return facets_by_variable


def is_valid_date(date):
  """
  Returns whether or not the date string is valid. Valid date strings are:
      1. empty or
      2. "latest" or
      3. of the form "YYYY" or "YYYY-MM" or "YYYY-MM-DD"
  """
  if not date or date == "latest" or re.match(r"^(\d\d\d\d)(-\d\d)?(-\d\d)?$",
                                              date):
    return True
  return False


@bp.route('/within')
def get_facets_within():
  """Gets the available facets for a list of stat vars for places of a specific
    type within a parent place. If minDate and maxDate are "latest",
    the latest date facets will be returned.

  Request body:
      parentPlace: the parent place of the places to get facets for
      childType: type of places to get facets for
      statVars: list of statistical variables to get facets for
      minDate (optional): earliest date to get facets for
      maxDate (optional): latest date to get facets for

  Returns a dict of sv to dict of facet id to facet information:
  {
      [sv]: {
          [facet1]: {
              "importName": "Census",
              "observationPeriod": "P1Y",
              ...
          },
          ...
      },
      ...
  }
  """
  parent_place = request.args.get('parentPlace')
  if not parent_place:
    return 'error: must provide a parentPlace field', 400
  child_type = request.args.get('childType')
  if not child_type:
    return 'error: must provide a childType field', 400
  stat_vars = list(filter(lambda x: x != "", request.args.getlist('statVars')))
  if not stat_vars:
    return 'error: must provide a statVars field', 400
  min_date = request.args.get('minDate')
  if not is_valid_date(min_date):
    return 'error: minDate must be YYYY or YYYY-MM or YYYY-MM-DD', 400
  max_date = request.args.get('maxDate')
  if not is_valid_date(max_date):
    return 'error: minDate must be YYYY or YYYY-MM or YYYY-MM-DD', 400
  # when min_date and max_date are the same and non empty, we will get the
  # points data, otherwise we will get series data
  if min_date and max_date and min_date == max_date:
    date = min_date
    if min_date == "latest":
      date = "LATEST"
    point_response = dc.obs_point_within(parent_place, child_type, stat_vars,
                                         date)
    return get_variable_facets_from_points(point_response), 200
  else:
    series_response = dc.obs_series_within(parent_place, child_type, stat_vars,
                                           True)
    return get_variable_facets_from_series(series_response), 200
