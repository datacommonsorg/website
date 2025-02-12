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
"""Unit tests for server.routes.dev_place.utils."""

import copy
import random
from typing import Dict, List
import unittest
from unittest import mock

from flask import Flask
from flask_caching import Cache
from flask_babel import Babel
import pytest

from server.routes.dev_place import utils
from server.routes.dev_place.types import BlockConfig
from server.routes.dev_place.types import Category
from server.routes.dev_place.types import Chart
from server.routes.dev_place.types import Place
from server.routes.dev_place.types import ServerBlockMetadata
from server.routes.dev_place.types import ServerChartConfiguration
from server.routes.dev_place.types import ServerChartMetadata
import server.routes.shared_api.place as place_api
from server.services import datacommons as dc

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
SAN_MATEO_COUNTY = Place(dcid="ggeoId/06081",
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


MOUNTAIN_VIEW_API_DATA = make_api_data(MOUNTAIN_VIEW)
CALIFORNIA_API_DATA = make_api_data(CALIFORNIA)
ARIZONA_API_DATA = make_api_data(ARIZONA)
NEW_YORK_API_DATA = make_api_data(NEW_YORK)
USA_API_DATA = make_api_data(USA)

SAMPLE_BLOCK_METADATA = ServerBlockMetadata('PLACE',
                                            [ServerChartMetadata('BAR')],
                                            is_overview=True)
SAMPLE_CHART_CONFIG = ServerChartConfiguration('Economics', 'title_id', 'title',
                                               'description',
                                               ['LifeExpectancy'], None,
                                               [SAMPLE_BLOCK_METADATA])


@pytest.fixture(scope="module")
def app():
  app = Flask(__name__)
  app.config['BABEL_DEFAULT_LOCALE'] = 'en'
  app.config['SERVER_NAME'] = 'example.com'
  app.config['CACHE_TYPE'] = 'null'
  app.config['CHART_CONFIG'] = [{
      'title': 'Chart',
      'title_id': 'Chart',
      'description': 'description',
      'denominator': ['Count_Person'],
      'category': 'Economics',
      'variables': ['LifeExpectancy'],
      'blocks': [{
          'place_scope': 'PLACE',
          'charts': [{
              'type': 'BAR'
          }]
      }]
  }]
  return app


class TestUtils(unittest.IsolatedAsyncioTestCase):
  """Tests for utils within the dev_place api."""

  @pytest.fixture(autouse=True)
  def setup_app_context(self, request):
    """Setup the app context and cache for each test."""

    self.app = request.getfixturevalue('app')
    self.cache = Cache(self.app)
    self.app_context = self.app.app_context()

  def setUp(self):
    super().setUp()

    self.mock_fetch_place = self.patch(utils, "fetch_place")
    self.v2node_api_response_index = 0

    def fetch_place_side_effect(place_dcid, locale=None):
      if place_dcid in PLACE_BY_ID:
        return PLACE_BY_ID[place_dcid]
      return None

    self.mock_fetch_place.side_effect = fetch_place_side_effect

    def fetch_api_place_type_side_effect(place_dcid):
      if place_dcid in PLACE_BY_ID:
        return PLACE_BY_ID[place_dcid].types[0]
      return None

    self.mock_api_place_type = self.patch(place_api, "api_place_type")
    self.mock_api_place_type.side_effect = fetch_api_place_type_side_effect

    def fetch_get_i18n_name_side_effect(place_dcids):
      return {p: PLACE_BY_ID[p].name for p in place_dcids if p in PLACE_BY_ID}

    self.mock_get_i18n_name = self.patch(place_api, "get_i18n_name")
    self.mock_get_i18n_name.side_effect = fetch_get_i18n_name_side_effect

    def place_to_place_resp(place: Place):
      return {'name': place.name, 'dcid': place.dcid, 'type': place.types[0]}

    def fetch_api_parent_places_side_effect(place_dcids, include_admin_areas):
      return {
          CALIFORNIA.dcid: [
              place_to_place_resp(USA),
              place_to_place_resp(NORTH_AMERICA),
              place_to_place_resp(EARTH)
          ]
      }

    self.mock_api_parent_places = self.patch(place_api, "parent_places")
    self.mock_api_parent_places.side_effect = fetch_api_parent_places_side_effect

    def mock_url_for_side_effect(place_dcid):
      return f"/place/{place_dcid}"

    self.mock_place_url = self.patch(utils, "get_place_url")
    self.mock_place_url.side_effect = mock_url_for_side_effect


    self.mock_translate = self.patch(place_api, "gettext")
    self.mock_v2node = self.patch(dc, "v2node")

    def fetch_translate(args, **kwargs):
      if 'placeType' in kwargs and 'parentPlaces' in kwargs:
        return f"{kwargs['placeType']} in {kwargs['parentPlaces']}"
      return args

    self.mock_translate.side_effect = fetch_translate

    self.mock_obs_point = self.patch(dc, "obs_point")
    self.mock_obs_point_within = self.patch(dc, "obs_point_within")

  def tearDown(self):
    self.cache.clear()
    super().tearDown()

  def patch(self, module, name):
    patcher = mock.patch.object(module, name)
    mock_obj = patcher.start()
    self.addCleanup(patcher.stop)
    return mock_obj

  def mock_v2node_api_data(self, response_list: list[dict]):

    def mock_v2node_side_effect(nodes, props):
      value = {
          "data":
              response_list[self.v2node_api_response_index % len(response_list)]
      }
      self.v2node_api_response_index += 1
      return value

    self.mock_v2node.side_effect = mock_v2node_side_effect

  def _create_ordered_facets(self, data, facets):
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

  def create_mock_data(self,
                       stat_var: str,
                       places: list[str],
                       data: list,
                       include_facets: bool = False) -> Dict[str, any]:
    by_entity = {}
    facets = {}
    for place in places:
      if include_facets:
        ordered_facets = self._create_ordered_facets(data, facets)
        by_entity[place] = {"orderedFacets": ordered_facets}
      else:
        by_entity[place] = data

    if include_facets:
      return {
          "byVariable": {
              stat_var: {
                  "byEntity": by_entity
              }
          },
          "facets": facets
      }

    return {"byVariable": {stat_var: {"byEntity": by_entity}}}

  def mock_dc_api_data(self,
                       stat_var: str,
                       places: List[str],
                       dc_obs_point: bool = False,
                       dc_obs_points_within: bool = False,
                       data: List[int] | None = None,
                       include_facets=False) -> Dict[str, any]:
    """Mocks the data from the DC API request obs point and obs point within."""
    if data is None:
      data = []

    val = self.create_mock_data(stat_var, places, data, include_facets)

    def mock_obs_point_side_effect(entities, variables, date='LATEST'):
      return val

    val2 = self.create_mock_data(stat_var, places, data, include_facets)

    def mock_obs_point_within_side_effect(entities, variables, date='LATEST'):
      return val2

    if dc_obs_point:
      self.mock_obs_point.side_effect = mock_obs_point_side_effect
    if dc_obs_points_within:
      self.mock_obs_point_within.side_effect = mock_obs_point_within_side_effect

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

  def test_get_place_html_link(self):
    """Tests the get_place_html_link generates the proper link."""
    ca_link = utils.get_place_html_link(CALIFORNIA.dcid, CALIFORNIA.name)
    africa_link = utils.get_place_html_link("africa", "Africa")

    self.assertEqual(ca_link, '<a href="/place/geoId/06">California</a>')
    self.assertEqual(africa_link, '<a href="/place/africa">Africa</a>')

  def test_get_parent_places(self):
    """Tests that getting parent places returns the proper values."""
    parents = utils.get_parent_places(CALIFORNIA.dcid)
    self.assertEqual([p.dcid for p in parents],
                     [USA.dcid, NORTH_AMERICA.dcid, EARTH.dcid])

  def test_get_parent_places_filters_invalid(self):
    """Tests that getting parent places returns the proper values."""
    self.mock_api_parent_places.side_effect = None
    self.mock_api_parent_places.return_value = {
        "geoId/06": [
            {
                "dcid": "geoId/06",
                "type": "State"  # missing name.
            },
            {
                "dcid": "country/USA",
                "name": "United States"  # missing types.
            },
            {
                "name": "United States",
                "types": "Continent"  # missing dcid.
            }
        ]
    }

    self.assertEqual(utils.get_parent_places(CALIFORNIA.dcid), [])

  def test_get_ordered_by_place_type_to_highlight_usa_place(self):
    """Tests that getting parent places returns the proper values in the right order for the USA place format."""
    places = [
        ZIP_94041, MOUNTAIN_VIEW, SANTA_CLARA_COUNTY, CALIFORNIA, USA,
        NORTH_AMERICA, EARTH
    ]
    # Zips should be removed, the order above is expected.
    expected_order = copy.deepcopy(places[1:])

    # randomize the order in place.
    random.shuffle(places)

    actual_order = utils.get_ordered_by_place_type_to_highlight(places)

    self.assertEqual(actual_order, expected_order)

  def test_get_ordered_by_place_type_to_highlight_eu_place(self):
    """Tests that getting parent places returns the proper values in the right order for the EU place format."""
    places = [
        NANTERRE, ARR_NANTERRE, ILE_DE_FRANCE, ILE_DE_FRANCE_NUTS1, FRANCE,
        EUROPE, EARTH
    ]

    # ARR_NANTERRE is an AA3 so remove it.
    expected_places = [places[0]] + places[2:]

    expected_order = copy.deepcopy(expected_places)

    # randomize the order in place.
    random.shuffle(places)

    actual_order = utils.get_ordered_by_place_type_to_highlight(places)

    self.assertEqual(actual_order, expected_order)

  def test_get_place_override_zip(self):
    places = [
        ZIP_94041, MOUNTAIN_VIEW, SANTA_CLARA_COUNTY, CALIFORNIA, USA,
        NORTH_AMERICA, EARTH
    ]

    random.shuffle(places)

    place = utils.get_place_override(places)
    self.assertEqual(place.dcid, MOUNTAIN_VIEW.dcid)

  def test_get_place_override_mtv(self):
    places = [
        MOUNTAIN_VIEW, SANTA_CLARA_COUNTY, CALIFORNIA, USA, NORTH_AMERICA, EARTH
    ]

    random.shuffle(places)

    place = utils.get_place_override(places)
    self.assertEqual(place.dcid, MOUNTAIN_VIEW.dcid)

  def test_get_place_override_ile_de_france(self):
    places = [ILE_DE_FRANCE, ILE_DE_FRANCE_NUTS1, FRANCE, EUROPE, EARTH]

    random.shuffle(places)

    place = utils.get_place_override(places)
    self.assertEqual(place.dcid, ILE_DE_FRANCE.dcid)

  def test_get_place_type_with_parent_places_links(self):
    place_str = utils.get_place_type_with_parent_places_links(CALIFORNIA.dcid)
    self.assertEqual(
        place_str,
        'State in <a href="/place/geoId/US">United States</a>, <a href="/place/northamerica">North America</a>, <a href="/place/Earth">Earth</a>'
    )

  def test_place_type_to_highlight(self):
    self.assertEqual(utils.place_type_to_highlight(["City", "State"]), "City")
    self.assertEqual(utils.place_type_to_highlight(["Place", "County"]),
                     "County")
    self.assertEqual(
        utils.place_type_to_highlight([
            "AdministrativeArea1", "AdministrativeArea2", "AdministrativeArea3"
        ]), "AdministrativeArea2")
    self.assertIsNone(
        utils.place_type_to_highlight(
            ["CensusZipCodeTabulationArea", "Town", "Zip", "Village"]))

  def test_filter_chart_config_for_data_existence_place_has_no_data(self):
    """Tests the filter_chart_config_for_data_existence function, which checks chart existence."""
    # Initialize the ServerChartConfig
    configs = [
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            None, [ServerBlockMetadata('PLACE', [ServerChartMetadata('BAR')])])
    ]

    self.mock_dc_api_data(stat_var='Count_Person',
                          places=[CALIFORNIA.dcid],
                          dc_obs_point=True,
                          dc_obs_points_within=True,
                          data=[])

    # Assert the chart is there.
    filtered_configs = utils.filter_chart_config_for_data_existence(
        configs, CALIFORNIA.dcid, CALIFORNIA.types[0],
        SANTA_CLARA_COUNTY.types[0], USA.dcid)

    self.assertEqual(filtered_configs, [])

  def test_filter_chart_config_for_data_existence_peers_have_no_data(self):
    """Tests the filter_chart_config_for_data_existence function, which checks chart existence."""
    # Initialize the ServerChartConfig
    configs = [
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            None, [
                ServerBlockMetadata('PEER_PLACES_WITHIN_PARENT',
                                    [ServerChartMetadata('BAR')])
            ]),
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            None, [ServerBlockMetadata('PLACE', [ServerChartMetadata('BAR')])])
    ]

    self.mock_dc_api_data(stat_var='Count_Person',
                          places=[CALIFORNIA.dcid],
                          dc_obs_point=True,
                          data=list([1234, 321]))
    self.mock_dc_api_data(stat_var='Count_Person',
                          places=[CALIFORNIA.dcid, ARIZONA.dcid, NEW_YORK.dcid],
                          dc_obs_points_within=True,
                          data=[])

    # Assert the chart is there.
    filtered_configs = utils.filter_chart_config_for_data_existence(
        configs, CALIFORNIA.dcid, CALIFORNIA.types[0],
        SANTA_CLARA_COUNTY.types[0], USA.dcid)

    self.assertEqual(len(filtered_configs), 1)
    self.assertEqual(filtered_configs, [
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            ['Count_Person'],
            [ServerBlockMetadata('PLACE', [ServerChartMetadata('BAR')])])
    ])

  def test_filter_chart_config_for_data_existence_children_have_no_data(self):
    """Tests the filter_chart_config_for_data_existence function, which checks chart existence."""
    # Initialize the ServerChartConfig
    configs = [
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            None,
            [ServerBlockMetadata('CHILD_PLACES', [ServerChartMetadata('BAR')])])
    ]

    self.mock_dc_api_data(stat_var='Count_Person',
                          places=[CALIFORNIA.dcid],
                          dc_obs_point=True,
                          data=[])
    self.mock_dc_api_data(stat_var='Count_Person',
                          places=[SANTA_CLARA_COUNTY.dcid],
                          dc_obs_points_within=True,
                          data=[])

    # Assert the chart is there.
    filtered_configs = utils.filter_chart_config_for_data_existence(
        configs, CALIFORNIA.dcid, CALIFORNIA.types[0],
        SANTA_CLARA_COUNTY.types[0], USA.dcid)

    self.assertEqual(filtered_configs, [])

  def test_filter_chart_config_for_data_existence_all_data(self):
    """Tests the filter_chart_config_for_data_existence function, which checks chart existence."""
    # Initialize the ServerChartConfig
    configs = [
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            None,
            [ServerBlockMetadata('CHILD_PLACES', [ServerChartMetadata('BAR')])
            ]),
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            None, [ServerBlockMetadata('PLACE', [ServerChartMetadata('BAR')])]),
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            None, [
                ServerBlockMetadata('PEER_PLACES_WITHIN_PARENT',
                                    [ServerChartMetadata('BAR')])
            ])
    ]

    self.mock_dc_api_data(stat_var='Count_Person',
                          places=[CALIFORNIA.dcid, NEW_YORK.dcid, ARIZONA.dcid],
                          dc_obs_point=True,
                          data=list([1234, 321]))
    self.mock_dc_api_data(stat_var='Count_Person',
                          places=[
                              SANTA_CLARA_COUNTY.dcid, SAN_MATEO_COUNTY.dcid,
                              CALIFORNIA.dcid, NEW_YORK.dcid, ARIZONA.dcid
                          ],
                          dc_obs_points_within=True,
                          data=list([1234, 321]))

    # Assert the chart is there.
    filtered_configs = utils.filter_chart_config_for_data_existence(
        configs, CALIFORNIA.dcid, CALIFORNIA.types[0],
        SANTA_CLARA_COUNTY.types[0], USA.dcid)

    expected_configs = [
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            ['Count_Person'],
            [ServerBlockMetadata('CHILD_PLACES', [ServerChartMetadata('BAR')])
            ]),
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            ['Count_Person'],
            [ServerBlockMetadata('PLACE', [ServerChartMetadata('BAR')])]),
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['Count_Person'],
            ['Count_Person'], [
                ServerBlockMetadata('PEER_PLACES_WITHIN_PARENT',
                                    [ServerChartMetadata('BAR')])
            ])
    ]

    self.assertEqual(filtered_configs, expected_configs)

  def test_filter_chart_config_for_data_existence_has_no_denominator_data(self):
    """Tests the filter_chart_config_for_data_existence function, which checks chart existence."""
    # Initialize the ServerChartConfig
    configs = [
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['LifeExpectancy'],
            None,
            [ServerBlockMetadata('CHILD_PLACES', [ServerChartMetadata('BAR')])
            ]),
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['LifeExpectancy'],
            None, [ServerBlockMetadata('PLACE', [ServerChartMetadata('BAR')])]),
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['LifeExpectancy'],
            None, [
                ServerBlockMetadata('PEER_PLACES_WITHIN_PARENT',
                                    [ServerChartMetadata('BAR')])
            ])
    ]

    self.mock_dc_api_data(stat_var='LifeExpectancy',
                          places=[CALIFORNIA.dcid, NEW_YORK.dcid, ARIZONA.dcid],
                          dc_obs_point=True,
                          data=list([1234, 321]))
    self.mock_dc_api_data(stat_var='LifeExpectancy',
                          places=[
                              CALIFORNIA.dcid, NEW_YORK.dcid, ARIZONA.dcid,
                              SANTA_CLARA_COUNTY.dcid, SAN_MATEO_COUNTY.dcid
                          ],
                          dc_obs_points_within=True,
                          data=list([1234, 321]))

    # Assert the chart is there.
    filtered_configs = utils.filter_chart_config_for_data_existence(
        configs, CALIFORNIA.dcid, CALIFORNIA.types[0],
        SANTA_CLARA_COUNTY.types[0], USA.dcid)

    expected_configs = [
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['LifeExpectancy'],
            ['Count_Person'], [
                ServerBlockMetadata('CHILD_PLACES',
                                    [ServerChartMetadata('BAR')],
                                    non_dividable=True)
            ]),
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['LifeExpectancy'],
            ['Count_Person'], [
                ServerBlockMetadata('PLACE', [ServerChartMetadata('BAR')],
                                    non_dividable=True)
            ]),
        ServerChartConfiguration(
            'Economics', 'CHART', 'CHART', 'description', ['LifeExpectancy'],
            ['Count_Person'], [
                ServerBlockMetadata('PEER_PLACES_WITHIN_PARENT',
                                    [ServerChartMetadata('BAR')],
                                    non_dividable=True)
            ])
    ]

    self.assertEqual(filtered_configs, expected_configs)

  def test_check_geo_data_exists_true(self):
    self.mock_v2node_api_data([{
        SAN_MATEO_COUNTY.dcid: {
            "properties": ["geoJsonCoordinatesDP3"]
        }
    }])

    self.assertTrue(utils.check_geo_data_exists(CALIFORNIA.dcid, "County"))

  def test_check_geo_data_exists_false(self):
    self.mock_v2node_api_data([{
        SAN_MATEO_COUNTY.dcid: {
            "properties": ["notAGeoProperty"]
        }
    }])

    self.assertFalse(utils.check_geo_data_exists(CALIFORNIA.dcid, "County"))

  def test_select_string_with_locale(self):
    strings = ["hello@en", "hola@es", "bonjour@fr"]
    self.assertEqual(utils.select_string_with_locale(strings, "es"), "hola")
    self.assertEqual(utils.select_string_with_locale(strings, "de"), "hello")
    self.assertEqual(utils.select_string_with_locale(["test"], "es"), "")

  def test_fetch_places(self):
    data = {
        MOUNTAIN_VIEW.dcid: MOUNTAIN_VIEW_API_DATA,
        CALIFORNIA.dcid: CALIFORNIA_API_DATA
    }
    self.mock_v2node_api_data([data])

    places = utils.fetch_places([MOUNTAIN_VIEW.dcid, CALIFORNIA.dcid])

    self.assertEqual([p.name for p in places],
                     [MOUNTAIN_VIEW.name, CALIFORNIA.name])

  def test_fetch_places_fr(self):
    ca_api_data = copy.deepcopy(CALIFORNIA_API_DATA)
    ca_api_data['arcs']['nameWithLanguage'] = {
        "nodes": [{
            'value': "California@en"
        }, {
            'value': "Californiafr@fr"
        }]
    }
    data = {
        MOUNTAIN_VIEW.dcid: MOUNTAIN_VIEW_API_DATA,
        CALIFORNIA.dcid: ca_api_data
    }
    self.mock_v2node_api_data([data])

    places = utils.fetch_places([MOUNTAIN_VIEW.dcid, CALIFORNIA.dcid],
                                locale="fr")

    self.assertEqual([p.name for p in places],
                     ["Mountain Viewfr", 'Californiafr'])

  def test_chart_config_to_overview_charts(self):
    chart_config = [
        ServerChartConfiguration(
            'Economics',
            'CHART',
            'CHART',
            'description', ['LifeExpectancy'], ['Count_Person'], [
                ServerBlockMetadata('CHILD_PLACES',
                                    [ServerChartMetadata('MAP')],
                                    title='Title!'),
                ServerBlockMetadata('PLACE', [
                    ServerChartMetadata('LINE'),
                    ServerChartMetadata('HIGHLIGHT')
                ]),
                ServerBlockMetadata('PEERS_PLACES_WITHIN_PARENT', [
                    ServerChartMetadata('BAR'),
                    ServerChartMetadata('HIGHLIGHT')
                ]),
            ],
            unit="USD",
            scaling=100)
    ]
    blocks = utils.chart_config_to_overview_charts(chart_config, "County")

    expected_blocks = [
        BlockConfig(charts=[Chart(type='MAP', maxPlaces=None)],
                    category='Economics',
                    title='Title!',
                    topicDcids=[],
                    description='description',
                    denominator=['Count_Person'],
                    statisticalVariableDcids=['LifeExpectancy'],
                    unit="USD",
                    scaling=100,
                    childPlaceType='County',
                    placeScope='CHILD_PLACES'),
        BlockConfig(charts=[
            Chart(type='LINE', maxPlaces=None),
            Chart(type='HIGHLIGHT', maxPlaces=None)
        ],
                    category='Economics',
                    title=None,
                    topicDcids=[],
                    description='description',
                    denominator=['Count_Person'],
                    statisticalVariableDcids=['LifeExpectancy'],
                    unit="USD",
                    scaling=100,
                    childPlaceType='County',
                    placeScope='PLACE'),
        BlockConfig(charts=[
            Chart(type='BAR', maxPlaces=None),
            Chart(type='HIGHLIGHT', maxPlaces=None)
        ],
                    category='Economics',
                    title=None,
                    topicDcids=[],
                    description='description',
                    denominator=['Count_Person'],
                    statisticalVariableDcids=['LifeExpectancy'],
                    unit="USD",
                    scaling=100,
                    childPlaceType='County',
                    placeScope='PEERS_PLACES_WITHIN_PARENT')
    ]
    self.assertEqual(blocks, expected_blocks)

  def test_get_child_place_types_france(self):
    data = {
        FRANCE.dcid: self.create_contained_in_data(["State", "EurostatNUTS1"])
    }
    self.mock_v2node_api_data([data])

    child_types = utils.get_child_place_types(FRANCE)
    self.assertEqual(child_types, ["State", "EurostatNUTS1"])

  def test_get_child_place_types_california(self):
    data = {CALIFORNIA.dcid: self.create_contained_in_data(["County"])}
    self.mock_v2node_api_data([data])

    child_types = utils.get_child_place_types(CALIFORNIA)
    self.assertEqual(child_types, ["County"])

  def test_get_child_place_type_to_highlight(self):

    data = {
        EARTH.dcid:
            self.create_contained_in_data(["Continent"]),
        USA.dcid:
            self.create_contained_in_data(["State", "County", "City"]),
        FRANCE.dcid:
            self.create_contained_in_data([
                "AdministrativeArea1", "AdministrativeArea2",
                "AdministrativeArea3"
            ]),
        CALIFORNIA.dcid:
            self.create_contained_in_data(["County", "City"]),
        SAN_MATEO_COUNTY.dcid:
            self.create_contained_in_data(
                ["City", "CensusZipCodeTabulationArea"]),
    }
    self.mock_v2node_api_data([data])

    self.assertEqual(utils.get_child_place_type_to_highlight(EARTH), "Country")
    self.assertEqual(utils.get_child_place_type_to_highlight(USA), "State")
    self.assertEqual(utils.get_child_place_type_to_highlight(FRANCE),
                     "AdministrativeArea1")
    self.assertEqual(utils.get_child_place_type_to_highlight(CALIFORNIA),
                     "County")
    self.assertEqual(utils.get_child_place_type_to_highlight(SAN_MATEO_COUNTY),
                     "City")

  def test_read_chart_configs(self):
    with self.app_context:
      configs = utils.read_chart_configs()

      self.assertEqual(configs, [
          ServerChartConfiguration(
              category='Economics',
              title='Chart',
              title_id='Chart',
              description='description',
              denominator=['Count_Person'],
              variables=['LifeExpectancy'],
              blocks=[
                  ServerBlockMetadata(place_scope='PLACE',
                                      charts=[ServerChartMetadata(type='BAR')])
              ])
      ])

  def test_fetch_child_place_dcids(self):
    api_data = copy.deepcopy(CALIFORNIA_API_DATA)
    api_data['arcs']['containedInPlace+'] = {
        "nodes": [{
            'value': MOUNTAIN_VIEW.dcid
        }]
    }
    data = {CALIFORNIA.dcid: api_data}
    self.mock_v2node_api_data([data])

    child_dcids = utils.fetch_child_place_dcids(CALIFORNIA, "City")
    self.assertEqual(child_dcids, [MOUNTAIN_VIEW.dcid])

  def test_translate_chart_config_place_titles(self):
    """Tests the most common scenario: PLACE scope and a title_id."""
    chart_config = [
        ServerChartConfiguration(
            'Economics', 'pop_count_id', 'Population Count', 'description',
            ['Count_Person'], None, [
                ServerBlockMetadata('PLACE', [ServerChartMetadata('BAR')]),
                ServerBlockMetadata('PEER_PLACES_WITHIN_PARENT',
                                    [ServerChartMetadata('BAR')]),
                ServerBlockMetadata('CHILD_PLACES',
                                    [ServerChartMetadata('BAR')])
            ])
    ]
    translated_config = utils.translate_chart_config(chart_config, "State",
                                                     "County", "California",
                                                     "United States")

    self.assertEqual([b.title for b in translated_config[0].blocks], [
        "California: pop_count_id",
        "Other Counties in United States: pop_count_id",
        "Counties in California: pop_count_id"
    ])

  def test_multiple_places_for_stat_var(self):
    obs_point_response = {
        "byVariable": {
            "stat_var_1": {
                "byEntity": {
                    "place_1": list([1234]),
                    "place_2": list([1234]),
                    "place_3": list([1234])
                }
            },
            "stat_var_2": {
                "byEntity": {
                    "place_4": list([1234, 321])
                }
            }
        }
    }
    stat_var_dcids = ["stat_var_1", "stat_var_2"]
    expected = {"stat_var_1": 2, "stat_var_2": 1}  # capped at 2
    result = utils.count_places_per_stat_var(obs_point_response, stat_var_dcids,
                                             2)
    self.assertEqual(result, expected)

  def test_empty_response(self):
    obs_point_response = {
        "byVariable": {
            "stat_var_1": {
                "byEntity": {}
            },
            "stat_var_2": {
                "byEntity": {}
            }
        }
    }
    stat_var_dcids = ["stat_var_1", "stat_var_2"]
    expected = {}
    result = utils.count_places_per_stat_var(obs_point_response, stat_var_dcids)
    self.assertEqual(result, expected)

  def test_filter_by_category(self):
    config = copy.deepcopy(SAMPLE_CHART_CONFIG)
    config2 = copy.deepcopy(SAMPLE_CHART_CONFIG)
    config.category = "Energy"
    config2.category = "Economics"

    energy_filtered = utils.filter_chart_config_for_category(
        "Energy", [config, config2])
    economics_filtered = utils.filter_chart_config_for_category(
        "Economics", [config, config2])
    self.maxDiff = None
    self.assertEqual(energy_filtered, [config])
    self.assertEqual(economics_filtered, [config2])

  def test_overview_filter_with_data(self):
    config = copy.deepcopy(SAMPLE_CHART_CONFIG)
    for block in config.blocks:
      block.is_overview = True

    overview_filtered = utils.filter_chart_config_for_category(
        "Overview", [config])
    self.maxDiff = None
    self.assertEqual(overview_filtered, [config])

  def test_overview_filter_no_overview_data(self):
    config = copy.deepcopy(SAMPLE_CHART_CONFIG)

    for block in config.blocks:
      block.is_overview = False

    overview_filtered = utils.filter_chart_config_for_category(
        "Overview", [config])
    self.assertEqual(overview_filtered, [config])  # Fallback to full config.

  def test_single_category(self):
    config = copy.deepcopy(SAMPLE_CHART_CONFIG)
    config.category = "Economics"
    config.blocks = [
        SAMPLE_BLOCK_METADATA, SAMPLE_BLOCK_METADATA, SAMPLE_BLOCK_METADATA
    ]

    config2 = copy.deepcopy(SAMPLE_CHART_CONFIG)
    config2.category = "Economics"
    config2.blocks = [SAMPLE_BLOCK_METADATA]

    config3 = copy.deepcopy(SAMPLE_CHART_CONFIG)
    config3.category = "Energy"
    config3.blocks = [SAMPLE_BLOCK_METADATA]

    expected_result: Dict[str, int] = {"Economics": 4, "Energy": 1}
    self.assertEqual(
        utils.get_block_count_per_category([config, config2, config3]),
        expected_result)

  def test_basic_categories(self):
    economics_config = copy.deepcopy(SAMPLE_CHART_CONFIG)
    economics_config.category = "Economics"

    economics_config2 = copy.deepcopy(SAMPLE_CHART_CONFIG)
    economics_config2.category = "Economics"
    for block in economics_config.blocks:
      block.is_overview = True

    energy_config = copy.deepcopy(SAMPLE_CHART_CONFIG)
    energy_config.category = "Energy"

    # Lets assume one economy config isn't in the overview.
    all_chart_config = [economics_config, economics_config2, energy_config]
    overview_config = [economics_config, energy_config]

    categories = utils.get_categories_metadata("Overview", all_chart_config,
                                               overview_config)

    energy_category = Category(
        name="Energy",
        translatedName="CHART_TITLE-CHART_CATEGORY-Energy",
        hasMoreCharts=False)
    econ_category = Category(
        name="Economics",
        translatedName="CHART_TITLE-CHART_CATEGORY-Economics",
        hasMoreCharts=True)
    self.assertEqual([econ_category, energy_category], categories)

  def test_fetch_nearby_places(self):
    api_data = copy.deepcopy(CALIFORNIA_API_DATA)
    api_data['arcs']['nearbyPlaces'] = {
        "nodes": [{
            "value": "geoId/04@1000m"
        }, {
            "value": "geoId/05@1000m"
        }]
    }
    data = {CALIFORNIA.dcid: api_data}

    self.mock_v2node_api_data([data])
    nearby_dcids = utils.fetch_nearby_place_dcids(CALIFORNIA)
    self.assertEqual(nearby_dcids, ["geoId/04", "geoId/05"])

  def test_extract_places(self):
    dissolved_san_mateo = copy.deepcopy(SAN_MATEO_COUNTY)
    dissolved_san_mateo.dissolved = True

    all_places = {
        CALIFORNIA.dcid: CALIFORNIA,
        MOUNTAIN_VIEW.dcid: MOUNTAIN_VIEW,
        SANTA_CLARA_COUNTY.dcid: SANTA_CLARA_COUNTY,
        SAN_MATEO_COUNTY.dcid: dissolved_san_mateo
    }
    dcids = [
        CALIFORNIA.dcid, MOUNTAIN_VIEW.dcid, SANTA_CLARA_COUNTY.dcid,
        dissolved_san_mateo.dcid
    ]
    extracted_places = utils.extract_places_from_dcids(all_places, dcids)

    self.assertEqual(extracted_places,
                     [CALIFORNIA, MOUNTAIN_VIEW, SANTA_CLARA_COUNTY])

  def test_fetch_peer_places_within_states(self):
    usa_api_data = copy.deepcopy(USA_API_DATA)
    usa_api_data['arcs']['containedInPlace+'] = {
        "nodes": [{
            'value': CALIFORNIA.dcid
        }, {
            'value': ARIZONA.dcid
        }, {
            'value': NEW_YORK.dcid
        }]
    }
    data = {
        CALIFORNIA.dcid: CALIFORNIA_API_DATA,
        USA.dcid: usa_api_data,
        ARIZONA.dcid: ARIZONA_API_DATA,
        NEW_YORK.dcid: NEW_YORK_API_DATA
    }
    self.mock_v2node_api_data([data, usa_api_data])

    peers = utils.fetch_peer_places_within(CALIFORNIA.dcid, ['State'])
    self.assertEqual(set(peers), {ARIZONA.dcid, NEW_YORK.dcid})

  def test_fetch_overview_table_data(self):
    self.mock_dc_api_data(stat_var='Count_Person',
                          places=[CALIFORNIA.dcid],
                          dc_obs_point=True,
                          dc_obs_points_within=False,
                          data=[123],
                          include_facets=True)
    resp = utils.fetch_overview_table_data(CALIFORNIA.dcid)
    self.maxDiff = None
    self.assertEqual(len(resp), 1)
    self.assertEqual(resp[0].name, 'VARIABLE_NAME-Count_Person')
    self.assertEqual(resp[0].provenanceUrl, 'prov.com/facet_0')
    self.assertEqual(resp[0].value, 123)
    self.assertEqual(resp[0].variableDcid, 'Count_Person')
