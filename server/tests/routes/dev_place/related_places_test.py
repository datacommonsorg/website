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
"""Unit tests for server.routes.dev_place.place_charts."""

import sys
import copy
import random
from flask import jsonify
from typing import Dict, List
import unittest
from unittest import mock

from flask import Flask
from flask import g
from flask_babel import Babel
from flask_caching import Cache
import pytest

from server.routes.dev_place import api
from server.routes.dev_place import utils
from server.routes.dev_place.types import BlockConfig
from server.routes.dev_place.types import Category
from server.routes.dev_place.types import Chart
from server.routes.dev_place.types import Place
from server.routes.dev_place.types import ServerBlockMetadata
from server.routes.dev_place.types import RelatedPlacesApiResponse
from server.routes.dev_place.types import ServerChartConfiguration
from server.routes.dev_place.types import ServerChartMetadata
import server.routes.shared_api.place as place_api
from server.services import datacommons as dc
from server.tests.routes.dev_place import mock_data


@pytest.fixture(scope="module")
def app():
  app = Flask(__name__)
  app.config['BABEL_DEFAULT_LOCALE'] = 'en'
  app.config['SERVER_NAME'] = 'example.com'
  app.config['CACHE_TYPE'] = 'simple'
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


class TestRelatedPlaces(unittest.IsolatedAsyncioTestCase):
  """Testing"""

  @pytest.fixture(autouse=True)
  def setup_app_context(self, request):
    """Setup the app context and cache for each test."""
    self.app = request.getfixturevalue('app')
    self.app.register_blueprint(api.bp)
    self.cache = Cache(self.app)
    self.app_context = self.app.app_context()

  def setUp(self):
    super().setUp()

    self.mock_v2node = self.patch(dc, "v2node")
    self.v2node_api_response_index = 0
    self.mock_obs_point = self.patch(dc, "obs_point")
    self.mock_obs_point_within = self.patch(dc, "obs_point_within")

    def fetch_get_i18n_name_side_effect(place_dcids):
      return {p: PLACE_BY_ID[p].name for p in place_dcids if p in PLACE_BY_ID}

    self.mock_get_i18n_name = self.patch(place_api, "get_i18n_name")
    self.mock_get_i18n_name.side_effect = fetch_get_i18n_name_side_effect

    self.mock_fetch_place = self.patch(utils, "fetch_place")

    def fetch_place_side_effect(place_dcid, locale=None):
      if place_dcid in mock_data.PLACE_BY_ID:
        return mock_data.PLACE_BY_ID[place_dcid]
      return None

    self.mock_fetch_place.side_effect = fetch_place_side_effect

    def place_to_place_resp(place: Place):
      return {'name': place.name, 'dcid': place.dcid, 'type': place.types[0]}

    def fetch_api_parent_places_side_effect(place_dcids, include_admin_areas):
      return {
          mock_data.CALIFORNIA.dcid: [
              place_to_place_resp(mock_data.USA),
              place_to_place_resp(mock_data.NORTH_AMERICA),
              place_to_place_resp(mock_data.EARTH)
          ]
      }

    self.mock_api_parent_places = self.patch(place_api, "parent_places")
    self.mock_api_parent_places.side_effect = fetch_api_parent_places_side_effect

  def tearDown(self):
    self.cache.clear()
    super().tearDown()

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

    val = mock_data.create_mock_data(stat_var, places, data, include_facets)

    def mock_obs_point_side_effect(entities, variables, date='LATEST'):
      return val

    val2 = mock_data.create_mock_data(stat_var, places, data, include_facets)

    def mock_obs_point_within_side_effect(entities, variables, date='LATEST'):
      return val2

    if dc_obs_point:
      self.mock_obs_point.side_effect = mock_obs_point_side_effect
    if dc_obs_points_within:
      self.mock_obs_point_within.side_effect = mock_obs_point_within_side_effect

  def mock_v2node_api_data(self, response_list: list[dict]):

    def mock_v2node_side_effect(nodes, props):
      value = {
          "data":
              response_list[self.v2node_api_response_index % len(response_list)]
      }
      self.v2node_api_response_index += 1
      return value

    self.mock_v2node.side_effect = mock_v2node_side_effect

  def patch(self, module, name):
    patcher = mock.patch.object(module, name)
    mock_obj = patcher.start()
    self.addCleanup(patcher.stop)
    return mock_obj

  def test_related_places_california(self):
    """Tests that getting parent places returns the proper values."""
    with self.app.app_context():
      print(self.app.url_map, file=sys.stderr)
      g.locale = 'en'
      self.mock_dc_api_data(stat_var='Count_Person',
                            places=["geoId/06"],
                            dc_obs_point=True,
                            dc_obs_points_within=True,
                            data=[])

      data_child_places = {
          mock_data.CALIFORNIA.dcid: self.create_contained_in_data(["City"])
      }
      ca_api_data = copy.deepcopy(mock_data.CALIFORNIA_API_DATA)
      ca_api_data['arcs']['containedInPlace+'] = {
          "nodes": [{
              'value': mock_data.MOUNTAIN_VIEW.dcid
          }]
      }
      data_place_data = {
          mock_data.MOUNTAIN_VIEW.dcid: mock_data.MOUNTAIN_VIEW_API_DATA,
          mock_data.CALIFORNIA.dcid: mock_data.CALIFORNIA_API_DATA
      }

      self.mock_v2node_api_data([data_child_places, data_place_data])

      response = self.app.test_client().get(
          f'/api/dev-place/related-places/geoId/06')

      actual = response.get_json()
      expected = jsonify(
          RelatedPlacesApiResponse(place=mock_data.CALIFORNIA,
                                   similarPlaces=[],
                                   childPlaces=[],
                                   parentPlaces=[
                                       mock_data.USA, mock_data.NORTH_AMERICA,
                                       mock_data.EARTH
                                   ],
                                   peersWithinParent=[],
                                   childPlaceType="County",
                                   nearbyPlaces=[])).get_json()

      self.assertEqual(response.status_code, 200)
      self.assertEqual(actual, expected)
