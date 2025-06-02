# Copyright 2025 Google LLC
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

from typing import Dict, List
from unittest import mock

from server.routes.place.types import Place

NANTERRE = Place(dcid="wikidataId/Q170507", name="Nanterre", types=["City"])
ARR_NANTERRE = Place(dcid="wikidataId/Q385728",
                     name="arrondissement of Nanterre",
                     types=["AdministrativeArea3"])
ILE_DE_FRANCE = Place(dcid="nuts/FR10",
                      name="Ile-de-France",
                      types=["EurostatNUTS2"])
ILE_DE_FRANCE_NUTS1 = Place(dcid="nuts/FR1",
                            name="Île-de-France",
                            types=["EurostatNUTS1"])
FRANCE = Place(dcid="country/FRA", name="France", types=["Country"])
EUROPE = Place(dcid="europe", name="Europe", types=["Continent"])

ZIP_94041 = Place(dcid="zip/94041",
                  name="94041",
                  types=["CensusZipCodeTabulationArea"])
MOUNTAIN_VIEW = Place(dcid="geoId/0649670",
                      name="Mountain View",
                      types=["City"])
PALO_ALTO = Place(dcid="geoId/0655282", name="Palo Alto", types=["City"])
LOS_ALTOS = Place(dcid="geoId/0643280", name="Los Altos", types=["City"])
SANTA_CLARA_COUNTY = Place(dcid="geoId/06085",
                           name="Santa Clara County",
                           types=["County"])
SAN_MATEO_COUNTY = Place(dcid="geoId/06081",
                         name="San Mateo County",
                         types=["County"])
CALIFORNIA = Place(dcid="geoId/06", name="California", types=["State"])
NEW_YORK = Place(dcid="geoId/36", name="New York", types=["State"])
ARIZONA = Place(dcid="geoId/04", name="Arizona", types=["State"])
USA = Place(dcid="geoId/US", name="United States", types=["Country"])
NORTH_AMERICA = Place(dcid="northamerica",
                      name="North America",
                      types=["Continent"])
EARTH = Place(dcid="Earth", name="Earth", types=["Place"])

PLACE_BY_ID = {
    NANTERRE.dcid: NANTERRE,
    ARR_NANTERRE.dcid: ARR_NANTERRE,
    ILE_DE_FRANCE.dcid: ILE_DE_FRANCE,
    ILE_DE_FRANCE_NUTS1.dcid: ILE_DE_FRANCE_NUTS1,
    FRANCE.dcid: FRANCE,
    EUROPE.dcid: EUROPE,
    ZIP_94041.dcid: ZIP_94041,
    MOUNTAIN_VIEW.dcid: MOUNTAIN_VIEW,
    SANTA_CLARA_COUNTY.dcid: SANTA_CLARA_COUNTY,
    SAN_MATEO_COUNTY.dcid: SAN_MATEO_COUNTY,
    CALIFORNIA.dcid: CALIFORNIA,
    USA.dcid: USA,
    NORTH_AMERICA.dcid: NORTH_AMERICA,
    EARTH.dcid: EARTH,
}


def make_api_data(place: Place):
  return {
      "arcs": {
          "typeOf": {
              "nodes": [{
                  'value': place.types[0]
              }]
          },
          "name": {
              "nodes": [{
                  'value': place.name
              }]
          },
          "nameWithLanguage": {
              "nodes": [{
                  'value': place.name + "@en"
              }, {
                  'value': place.name + "fr@fr"
              }, {
                  'value': place.name + "es@es"
              }]
          }
      }
  }


def create_contained_in_data(types_list):
  """
    Creates the CONTAINED_IN_DATA dictionary structure from a list of node dictionaries.

    Args:
        nodes_data: A list of dictionaries, where each dictionary represents a node
                    and contains a "types" key with a list of type strings.

    Returns:
        A dictionary in the CONTAINED_IN_DATA format.
    """
  data = {"arcs": {"containedInPlace": {"nodes": []}}}

  for type_ in types_list:
    data["arcs"]["containedInPlace"]["nodes"].append({"types": [type_]})
  return data


def mock_dc_api_data(stat_var: str,
                     places: List[str],
                     dc_obs_point: bool = False,
                     dc_obs_points_within: bool = False,
                     mock_obs_point: mock.Mock = None,
                     mock_obs_point_within: mock.Mock = None,
                     data: List[int] | List[Dict[str, any]] | None = None,
                     include_facets=False,
                     single_facet=False) -> Dict[str, any]:
  """Mocks the data from the DC API request obs point and obs point within.

  Args:
    stat_var: The stat var to mock.
    places: The places to mock.
    dc_obs_point: If true, the data will be mocked for the obs point.
    dc_obs_points_within: If true, the data will be mocked for the obs point within.
    mock_obs_point: The mock object to use for the obs point.
    mock_obs_point_within: The mock object to use for the obs point within.
    data: The data to mock.
    include_facets: If true, the data will be mocked as orderedFacets.
    single_facet: If include_facets is true.
      If true, the data will be combined into a single facet in orderedFacets. 
      If false, the data will be mocked as multiple facets in orderedFacets.

  data can be a list of observation values or a list of observation dicts.

  Example 1:
  data = [100, 200, 300]

  Example 2:
  data = [
    {
      "date": "2023-01-01",
      "value": 100
    },
    {
      "date": "2023-01-02",
      "value": 200
    }
  ]
  """
  if data is None:
    data = []

  val = create_mock_data(stat_var, places, data, include_facets, single_facet)
  val2 = create_mock_data(stat_var, places, data, include_facets, single_facet)

  def mock_obs_point_side_effect(entities, variables, date='LATEST'):
    return val

  def mock_obs_point_within_side_effect(entities, variables, date='LATEST'):
    return val2

  if dc_obs_point:
    mock_obs_point.side_effect = mock_obs_point_side_effect
  if dc_obs_points_within:
    mock_obs_point_within.side_effect = mock_obs_point_within_side_effect


def _create_ordered_facets(data, facets, single_facet):
  ordered_facets = []
  if single_facet:
    facet_id = "facet_1"
    observations = [
        o if isinstance(o, dict) else {
            "date": o,
            "value": o
        } for o in data
    ]
    ordered_facets.append({
        "facetId": facet_id,
        "observations": observations,
        "provenanceUrl": f"prov.com/{facet_id}",
        "unit": "count",
        "latestDate": observations[-1]["date"],
        "earliestDate": observations[0]["date"]
    })
    facets[facet_id] = {
        "provenanceUrl": f"prov.com/{facet_id}",
        "unit": "count"
    }
  else:
    for i, val in enumerate(data):
      facet_id = f"facet_{i}"
      if isinstance(val, dict):
        observation = val
      else:
        observation = {
            "date": f"2023-{i+1:02}-01",
            "value": val,
        }
      ordered_facets.append({
          "facetId": facet_id,
          "observations": [observation],
          "provenanceUrl": f"prov.com/{facet_id}",
          "unit": "count",
          "latestDate": observation["date"],
          "earliestDate": observation["date"]
      })
      facets[facet_id] = {
          "provenanceUrl": f"prov.com/{facet_id}",
          "unit": "count"
      }
  return ordered_facets


def create_mock_data(stat_var: str,
                     places: list[str],
                     data: list,
                     include_facets: bool = False,
                     single_facet: bool = False) -> Dict[str, any]:
  by_entity = {}
  facets = {}
  for place in places:
    if include_facets:
      ordered_facets = _create_ordered_facets(data, facets, single_facet)
      by_entity[place] = {"orderedFacets": ordered_facets}
    else:
      by_entity[place] = data

  if include_facets:
    return {"byVariable": {stat_var: {"byEntity": by_entity}}, "facets": facets}

  return {"byVariable": {stat_var: {"byEntity": by_entity}}}


SAN_MATEO_COUNTY_API_DATA = make_api_data(SAN_MATEO_COUNTY)
MOUNTAIN_VIEW_API_DATA = make_api_data(MOUNTAIN_VIEW)
CALIFORNIA_API_DATA = make_api_data(CALIFORNIA)
ARIZONA_API_DATA = make_api_data(ARIZONA)
NEW_YORK_API_DATA = make_api_data(NEW_YORK)
USA_API_DATA = make_api_data(USA)
EARTH_API_DATA = make_api_data(EARTH)
NORTH_AMERICA_API_DATA = make_api_data(NORTH_AMERICA)
