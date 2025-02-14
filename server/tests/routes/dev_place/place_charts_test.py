# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import unittest
from unittest.mock import patch

from server.tests.routes.api import mock_data
from web_app import app

# TODO(gmechali): Refactor to use the mocking in mock_data.

class TestPlaceAPI(unittest.TestCase):
  """Tests for the Place API."""

  @patch('server.routes.shared_api.place.parent_places')
  @patch('server.lib.fetch.raw_property_values')
  @patch('server.lib.fetch.multiple_property_values')
  @patch('server.services.datacommons.obs_point')
  @patch('server.services.datacommons.obs_point_within')
  def test_dev_place_charts(self, mock_obs_point_within, mock_obs_point,
                            mock_multiple_property_values,
                            mock_raw_property_values, mock_parent_places):
    """Test the place_charts endpoint."""

    with app.app_context():
      # Sample place_dcid
      place_dcid = "country/USA"

      # Override the CHART_CONFIG with sample values
      app.config['CHART_CONFIG'] = mock_data.SAMPLE_PLACE_PAGE_CHART_CONFIG

      # Mock obs_point call with a properly structured response
      mock_obs_point.return_value = mock_data.OSERVATION_POINT_RESPONSE

      # Mock obs_point_within for finding child places existence check for map-based stat vars
      mock_obs_point_within.return_value = mock_data.OSERVATION_WITHIN_POINT_RESPONSE

      mock_multiple_property_values.return_value = mock_data.MULTIPLE_PROPERTY_VALUES_RESPONSE

      # Mock fetch.raw_property_values to return empty lists (no nearby or similar places)
      mock_raw_property_values.return_value = {place_dcid: []}

      mock_parent_places.return_value = {
          'dcid': 'northamerica',
          'parents': [{
              'type': 'Continent',
              'dcid': 'northamerica'
          }]
      }

      # Send a GET request to the new endpoint
      response = app.test_client().get(f'/api/dev-place/charts/{place_dcid}')

      # Check if the response is successful
      print(response)
      self.assertEqual(response.status_code, 200)

      # Check that the response data contains expected fields
      response_json = response.get_json()
      self.assertIn('blocks', response_json)
      self.assertIn('place', response_json)
      self.assertIn('categories', response_json)
      self.assertIn('charts', response_json['blocks'][0])

      # Check that the 'charts' field contains the expected number of charts
      # Two charts have data (Crime and one Education stat var), and each has a
      # related chart, so we expect four charts
      self.assertEqual(
          sum(len(block.get('charts',)) for block in response_json['blocks']),
          4)

      # Optionally, check that the charts have the correct titles
      block_titles = [block['title'] for block in response_json['blocks']]
      self.assertIn('United States: Total crime', block_titles)
      self.assertIn('United States: Education attainment', block_titles)

      # Check that the 'place' field contains correct place information
      self.assertEqual(response_json['place']['dcid'], place_dcid)
      self.assertEqual(response_json['place']['name'], 'United States')
      self.assertEqual(response_json['place']['types'], ['Country'])

      # Check that 'categories' contains expected categories
      categories = [
          category['translatedName'] for category in response_json['categories']
      ]
      self.assertIn('Crime', categories)
      self.assertIn('Education', categories)

      # Ensure the denominator is present in chart results
      self.assertEqual(1, len(response_json["blocks"][0]["denominator"]))

      # TODO(gmechali): Imrpove test coverage of intricacies of the place charts selection.
      self.assertIsNone(response_json["blocks"][1]["denominator"])
