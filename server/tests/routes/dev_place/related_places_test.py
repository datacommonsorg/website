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
import unittest
from unittest import mock

from flask import Flask
from flask import g
from flask import jsonify
from flask_caching import Cache
import pytest

from server.lib import fetch
from server.routes.dev_place import api
from server.routes.dev_place.types import Place
from server.routes.dev_place.types import RelatedPlacesApiResponse
import server.routes.shared_api.place as place_api
from server.services import datacommons as dc
from server.tests.routes.dev_place import mock_data


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
  app.register_blueprint(api.bp)
  return app


class TestRelatedPlaces(unittest.IsolatedAsyncioTestCase):
  """Tests for the related places api endpoint."""

  @pytest.fixture(autouse=True)
  def setup_app_context(self, request):
    """Setup the app context and cache for each test."""
    self.app = request.getfixturevalue('app')
    self.cache = Cache(self.app)
    self.app_context = self.app.app_context()

  def setUp(self):
    super().setUp()

    self.mock_v2node = self.patch(dc, "v2node")
    self.v2node_api_response_index = 0
    self.mock_obs_point = self.patch(dc, "obs_point")
    self.mock_obs_point_within = self.patch(dc, "obs_point_within")
    self.mock_descendent_places = self.patch(fetch, "descendent_places")

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

    def fetch_descendent_places_side_effect(nodes, descendent_type):
      return {
          mock_data.CALIFORNIA.dcid: [mock_data.SAN_MATEO_COUNTY.dcid],
          mock_data.USA.dcid: [
              mock_data.ARIZONA.dcid, mock_data.NEW_YORK.dcid,
              mock_data.CALIFORNIA.dcid
          ]
      }

    self.mock_descendent_places.side_effect = fetch_descendent_places_side_effect

  def tearDown(self):
    self.cache.clear()
    super().tearDown()

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
    """Tests that the related places endpoint succeeds for california."""
    with self.app.app_context():
      g.locale = 'en'
      data_child_places = {
          mock_data.CALIFORNIA.dcid:
              mock_data.create_contained_in_data(["County"]),
          mock_data.USA.dcid:
              mock_data.create_contained_in_data(["State"]),
          mock_data.SAN_MATEO_COUNTY.dcid:
              mock_data.create_contained_in_data(["City"]),
      }
      data_place_data = {
          mock_data.SAN_MATEO_COUNTY.dcid: mock_data.SAN_MATEO_COUNTY_API_DATA,
          mock_data.CALIFORNIA.dcid: mock_data.CALIFORNIA_API_DATA,
          mock_data.USA.dcid: mock_data.USA_API_DATA,
          mock_data.NORTH_AMERICA.dcid: mock_data.NORTH_AMERICA_API_DATA,
          mock_data.EARTH.dcid: mock_data.EARTH_API_DATA
      }

      self.mock_v2node_api_data([data_child_places, data_place_data,  data_place_data,  data_place_data,  data_place_data])

      response = self.app.test_client().get(
          f'/api/dev-place/related-places/geoId/06')

      actual = response.get_json()
      expected = jsonify(
          RelatedPlacesApiResponse(
              place=Place(dcid=mock_data.CALIFORNIA.dcid,
                          name=mock_data.CALIFORNIA.dcid,
                          types=[]),
              similarPlaces=[],
              childPlaces=[mock_data.SAN_MATEO_COUNTY],
              parentPlaces=[
                  mock_data.USA, mock_data.NORTH_AMERICA, mock_data.EARTH
              ],
              peersWithinParent=[],
              childPlaceType="County",
              nearbyPlaces=[])).get_json()

      self.assertEqual(response.status_code, 200)

      # We leave it out of the above because the order gets shuffled.
      actual_peers_within_parents_set = set(actual['peersWithinParent'])
      actual['peersWithinParent'] = []
      expected_peers_within_parents = {
          mock_data.ARIZONA.dcid, mock_data.NEW_YORK.dcid
      }

      self.assertEqual(actual, expected)
      self.assertEqual(actual_peers_within_parents_set,
                       expected_peers_within_parents)

  def test_related_places_california_es(self):
    """Tests that the related places endpoint succeeds for california."""
    with self.app.app_context():
      g.locale = 'es'
      data_child_places = {
          mock_data.CALIFORNIA.dcid:
              mock_data.create_contained_in_data(["County"]),
          mock_data.USA.dcid:
              mock_data.create_contained_in_data(["State"]),
          mock_data.SAN_MATEO_COUNTY.dcid:
              mock_data.create_contained_in_data(["City"]),
      }
      data_place_data = {
          mock_data.SAN_MATEO_COUNTY.dcid: mock_data.SAN_MATEO_COUNTY_API_DATA,
          mock_data.CALIFORNIA.dcid: mock_data.CALIFORNIA_API_DATA,
          mock_data.USA.dcid: mock_data.USA_API_DATA,
          mock_data.NORTH_AMERICA.dcid: mock_data.NORTH_AMERICA_API_DATA,
          mock_data.EARTH.dcid: mock_data.EARTH_API_DATA
      }

      self.mock_v2node_api_data([data_child_places, data_place_data,  data_place_data,  data_place_data,  data_place_data])

      response = self.app.test_client().get(
          f'/api/dev-place/related-places/geoId/06?hl=es')

      # TODO(gmechali): Verify why test is spitting the out the dcid instead of name. I think it has to do with i18n.
      parent_places_es = [mock_data.USA, mock_data.NORTH_AMERICA, mock_data.EARTH] 
      for parent in parent_places_es:
        parent.name += 'es'

      actual = response.get_json()
      expected = jsonify(
          RelatedPlacesApiResponse(
              place=Place(dcid=mock_data.CALIFORNIA.dcid,
                          name=mock_data.CALIFORNIA.dcid,
                          types=[]),
              similarPlaces=[],
              childPlaces=[
                  Place(dcid=mock_data.SAN_MATEO_COUNTY.dcid,
                        name=mock_data.SAN_MATEO_COUNTY.name + 'es',
                        types=mock_data.SAN_MATEO_COUNTY.types)
              ],
              parentPlaces=parent_places_es,
              peersWithinParent=[],
              childPlaceType="County",
              nearbyPlaces=[])).get_json()

      self.assertEqual(response.status_code, 200)

      # We leave it out of the above because the order gets shuffled.
      actual_peers_within_parents_set = set(actual['peersWithinParent'])
      actual['peersWithinParent'] = []
      expected_peers_within_parents = {
          mock_data.ARIZONA.dcid, mock_data.NEW_YORK.dcid
      }
      self.maxDiff = None
      self.assertEqual(actual, expected)
      self.assertEqual(actual_peers_within_parents_set,
                       expected_peers_within_parents)

  def test_related_places_requires_dcid(self):
    """Tests that the related places endpoint requires a dcid."""
    with self.app.app_context():
      g.locale = 'en'

      response = self.app.test_client().get(f'/api/dev-place/related-places/')

      self.assertEqual(response.status_code, 404)
