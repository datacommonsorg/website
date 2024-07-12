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

from server.lib import util
import server.services.datacommons as dc

# Define blueprint
bp = Blueprint("observation_dates", __name__)


@bp.route('/api/observation-dates')
def observation_dates():
  """Given ancestor place, child place type and stat vars, return the dates that
	have data for each stat var across all child places.
  """
  parent_entity = request.args.get('parentEntity')
  if not parent_entity:
    return 'error: must provide a parentEntity field', 400
  child_type = request.args.get('childType')
  if not child_type:
    return 'error: must provide a childType field', 400
  variable = request.args.get('variable')
  if not variable:
    return 'error: must provide a variable field', 400
  return dc.get_series_dates(parent_entity, child_type, [variable])


@bp.route('/api/observation-dates/entities')
def observation_dates_entities():
  """
  Retrieve observation dates for specified entities and variables.

  Query Parameters:
  - entities (List[str]): List of entity DCIDs.
  - variables (List[str]): List of variable names.

  Returns:
  - dict: JSON object with 'datesByVariable' and 'facets' keys.
    - 'datesByVariable': List of dictionaries grouped by variable, date, and facet.
    - 'facets': Facet information from the observation series response.

  Errors:
  - 400: If 'entities' or 'variables' parameters are missing or empty.

  Example:
  ```
  GET /api/observation-dates/entities?entities=country/USA&entities=country/CAN&variables=Count_Person&variables=Count_Household
  Response:
  {
      "datesByVariable": [
          {
              "variable": "Count_Person",
              "observationDates": [
                  {
                      "date": "1900",
                      "entityCount": [
                          {
                              "facet": "2176550201",
                              "count": 1
                          }
                      ]
                  },
                  {
                      "date": "1901",
                      "entityCount": [
                          {
                              "facet": "2176550201",
                              "count": 1
                          }
                      ]
                  }
              ]
          },
          {
              "variable": "Count_Household",
              "observationDates": [
                  {
                      "date": "1900",
                      "entityCount": [
                          {
                              "facet": "2176550202",
                              "count": 1
                          }
                      ]
                  },
                  {
                      "date": "1901",
                      "entityCount": [
                          {
                              "facet": "2176550202",
                              "count": 1
                          }
                      ]
                  }
              ]
          }
      ],
      "facets": {
          "2176550201": {"importName": "facet1"},
          "2176550202": {"importName": "facet2"}
      }
  }
  ```
  """
  entities = request.args.getlist('entities')
  if len(entities) == 0:
    return 'error: must provide entities field', 400
  variables = request.args.getlist('variables')
  if len(variables) == 0:
    return 'error: must provide a variables field', 400
  return util.get_series_dates_from_entities(entities, variables)
