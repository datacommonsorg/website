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

from server.routes.dev_place.types import Place

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
          "dissolutionDate": {
              "nodes": [{
                  'value': None
              }]
          },
          "nameWithLanguage": {
              "nodes": [{
                  'value': place.name + "@en"
              }, {
                  'value': place.name + "fr@fr"
              }]
          }
      }
  }


def create_contained_in_data(self, types_list):
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
                     data: List[int] | None = None,
                     include_facets=False) -> Dict[str, any]:
  """Mocks the data from the DC API request obs point and obs point within."""
  if data is None:
    data = []

  val = create_mock_data(stat_var, places, data, include_facets)
  val2 = create_mock_data(stat_var, places, data, include_facets)

  def mock_obs_point_side_effect(entities, variables, date='LATEST'):
    return val

  def mock_obs_point_within_side_effect(entities, variables, date='LATEST'):
    return val2

  if dc_obs_point:
    mock_obs_point.side_effect = mock_obs_point_side_effect
  if dc_obs_points_within:
    mock_obs_point_within.side_effect = mock_obs_point_within_side_effect


def _create_ordered_facets(data, facets):
  ordered_facets = []
  for i, val in enumerate(data):
    facet_id = f"facet_{i}"
    observation = {
        "date": f"2023-{i+1:02}-01",
        "value": val,
    }
    ordered_facets.append({
        "facetId": facet_id,
        "observations": [observation],
        "provenanceUrl": f"prov.com/{facet_id}",
        "unit": "count"
    })
    facets[facet_id] = {
        "provenanceUrl": f"prov.com/{facet_id}",
        "unit": "count"
    }
  return ordered_facets


def create_mock_data(stat_var: str,
                     places: list[str],
                     data: list,
                     include_facets: bool = False) -> Dict[str, any]:
  by_entity = {}
  facets = {}
  for place in places:
    if include_facets:
      ordered_facets = _create_ordered_facets(data, facets)
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
