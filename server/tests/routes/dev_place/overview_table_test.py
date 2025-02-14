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
"""Unit tests for server.routes.dev_place.overview_table."""

from typing import Dict, List
import unittest
from unittest import mock

from flask import Flask
from flask import g
from flask import jsonify
from flask_caching import Cache
import pytest

from server.lib import fetch
from server.lib import i18n_messages
from server.routes.dev_place import api
from server.routes.dev_place import utils
from server.routes.dev_place.types import OverviewTableDataRow
from server.routes.dev_place.types import Place
from server.routes.dev_place.types import PlaceOverviewTableApiResponse
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


class TestOverviewTable(unittest.IsolatedAsyncioTestCase):
  """Tests for the overview table api endpoint"""

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
    self.mock_local_translate = self.patch(i18n_messages, "gettext")

    def fetch_get_i18n_name_side_effect(place_dcids):
      return {p: PLACE_BY_ID[p].name for p in place_dcids if p in PLACE_BY_ID}

    self.mock_get_i18n_name = self.patch(place_api, "get_i18n_name")
    self.mock_get_i18n_name.side_effect = fetch_get_i18n_name_side_effect

    def mock_local_translate_side_effect(variables):
      return variables

    self.mock_local_translate.side_effect = mock_local_translate_side_effect

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

  def test_overview_table_california(self):
    """Tests that the overview table for california succeeds."""
    with self.app.app_context():
      g.locale = 'en'
      mock_data.mock_dc_api_data(
          stat_var='Count_Person',
          places=[mock_data.CALIFORNIA.dcid],
          dc_obs_point=True,
          dc_obs_points_within=False,
          mock_obs_point=self.mock_obs_point,
          mock_obs_point_within=self.mock_obs_point_within,
          data=[123],
          include_facets=True)

      row = OverviewTableDataRow(date='2023-01-01',
                                 name='Population',
                                 provenanceUrl='prov.com/facet_0',
                                 unit='count',
                                 value=123,
                                 variableDcid='Count_Person')
      expected = jsonify(PlaceOverviewTableApiResponse(data=[row])).get_json()

      response = self.app.test_client().get(
          f'/api/dev-place/overview-table/geoId/06')

      actual = response.get_json()

      self.assertEqual(response.status_code, 200)
      self.assertEqual(actual, expected)

  def test_overview_table_requires_dcid(self):
    """Tests the overview table endpoint requires a dcid."""
    with self.app.app_context():
      g.locale = 'en'

      response = self.app.test_client().get(f'/api/dev-place/related-places/')

      self.assertEqual(response.status_code, 404)
