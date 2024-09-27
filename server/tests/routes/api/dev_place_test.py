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

from server.routes.dev_place.types import Place
from web_app import app

SAMPLE_CHART_CONFIG = [{
    "category": "Crime",
    "titleId": "CHART_TITLE-Total_crime",
    "title": "Total crime",
    "description": "Total number of criminal incidents",
    "statsVars": ["Count_CriminalActivities_CombinedCrime"],
    "isOverview": True,
    "relatedChart": {
        "titleId": "CHART_TITLE-Crime_rate",
        "title": "Crimes per 100,000 people",
        "description": "Total number of criminal incidents per 100,000 people",
        "scale": True,
        "denominator": "Count_Person",
        "scaling": 100000
    }
}, {
    "category":
        "Education",
    "titleId":
        "CHART_TITLE-Educational_attainment",
    "title":
        "Education attainment",
    "denominator": [
        "Sample_Denominator_1", "Sample_Denominator_2", "Sample_Denominator_3",
        "Sample_Denominator_4", "Sample_Denominator_5"
    ],
    "description":
        "Number of people who have attained various educational milestones, e.g. completed high school or have a bachelor's degree",
    "statsVars": [
        "Count_Person_EducationalAttainmentNoSchoolingCompleted",
        "Count_Person_EducationalAttainmentRegularHighSchoolDiploma",
        "Count_Person_EducationalAttainmentBachelorsDegree",
        "Count_Person_EducationalAttainmentMastersDegree",
        "Count_Person_EducationalAttainmentDoctorateDegree"
    ],
    "isOverview":
        True,
    "relatedChart": {
        "titleId":
            "CHART_TITLE-Educational_attainment_rate",
        "title":
            "Education attainment rate",
        "description":
            "Percentage of the adult population who have attained various educational milestones, e.g. completed high school or have a bachelor's degree",
        "scale":
            True,
        "denominator":
            "Count_Person_25OrMoreYears",
        "scaling":
            100,
        "unit":
            "%"
    }
}]


class TestPlaceAPI(unittest.TestCase):

  @patch('server.lib.fetch.raw_property_values')
  @patch('server.lib.fetch.property_values')
  @patch('server.services.datacommons.obs_point')
  def test_dev_place_charts(self, mock_obs_point, mock_property_values,
                            mock_raw_property_values):
    """Test the place_charts endpoint."""

    with app.app_context():
      # Sample place_dcid
      place_dcid = "country/USA"

      # Override the CHART_CONFIG with sample values
      app.config['CHART_CONFIG'] = SAMPLE_CHART_CONFIG

      # Mock obs_point call with a properly structured response
      mock_obs_point.return_value = {
          "byVariable": {
              "Count_CriminalActivities_CombinedCrime": {
                  "byEntity": {
                      place_dcid: {
                          "dates": {
                              "2022": {
                                  "value": 1000
                              }
                          }
                      }
                  }
              },
              # Include one education stat var to simulate data availability
              "Count_Person_EducationalAttainmentBachelorsDegree": {
                  "byEntity": {
                      place_dcid: {
                          "dates": {
                              "2022": {
                                  "value": 500
                              }
                          }
                      }
                  }
              }
          }
      }

      # Mock fetch.property_values to return basic place information
      def mock_property_values_side_effect(dcids, prop):
        if prop == 'typeOf':
          return {dcid: ['Country'] for dcid in dcids}
        elif prop == 'name':
          return {dcid: ['United States'] for dcid in dcids}
        else:
          return {dcid: [] for dcid in dcids}

      mock_property_values.side_effect = mock_property_values_side_effect

      # Mock fetch.raw_property_values to return empty lists (no nearby or similar places)
      mock_raw_property_values.return_value = {place_dcid: []}

      # Send a GET request to the new endpoint
      response = app.test_client().get(f'/api/dev-place/charts/{place_dcid}')

      # Check if the response is successful
      self.assertEqual(response.status_code, 200)

      # Check that the response data contains expected fields
      response_json = response.get_json()
      self.assertIn('charts', response_json)
      self.assertIn('place', response_json)
      self.assertIn('translatedCategoryStrings', response_json)

      # Check that the 'charts' field contains the expected number of charts
      # Since only two charts have data (Crime and one Education stat var), we expect two charts
      self.assertEqual(len(response_json['charts']), 2)

      # Optionally, check that the charts have the correct titles
      chart_titles = [chart['title'] for chart in response_json['charts']]
      self.assertIn('Total crime', chart_titles)
      self.assertIn('Education attainment', chart_titles)

      # Check that the 'place' field contains correct place information
      self.assertEqual(response_json['place']['dcid'], place_dcid)
      self.assertEqual(response_json['place']['name'], 'United States')
      self.assertEqual(response_json['place']['types'], ['Country'])

      # Check that 'translatedCategoryStrings' contains expected categories
      self.assertIn('Crime', response_json['translatedCategoryStrings'])
      self.assertIn('Education', response_json['translatedCategoryStrings'])

      # Ensure the denominator is present in chart results
      self.assertEqual(5, len(response_json["charts"][1]["denominator"]))

  @patch('server.routes.dev_place.utils.fetch.raw_property_values')
  @patch('server.routes.dev_place.utils.fetch.property_values')
  def test_related_places(self, mock_property_values, mock_raw_property_values):
    """Test the /api/dev-place/related-places endpoint. Mocks fetch.* and dc.* calls."""

    with app.app_context():
      # Sample place_dcid
      place_dcid = 'country/USA'

      # Define side effects for mock_property_values
      def mock_property_values_side_effect(dcids, prop):
        result = {}
        for dcid in dcids:
          if prop == 'typeOf':
            if dcid == place_dcid:
              result[dcid] = ['Country']
            elif dcid in [
                'country/CAN', 'country/MEX', 'country/GBR', 'country/AUS'
            ]:
              result[dcid] = ['Country']
            elif dcid in ['geoId/06', 'geoId/07']:
              result[dcid] = ['State']
            else:
              result[dcid] = ['Place']
          elif prop == 'name':
            result[dcid] = [f'Name of {dcid}']
          elif prop == 'nameWithLanguage':
            result[dcid] = []
          else:
            result[dcid] = []
        return result

      mock_property_values.side_effect = mock_property_values_side_effect

      # Define side effects for mock_raw_property_values
      def mock_raw_property_values_side_effect(nodes, prop, out):
        if prop == 'containedInPlace' and not out:
          # Return child places
          return {
              nodes[0]: [{
                  'dcid': 'geoId/06',
                  'types': ['State']
              }, {
                  'dcid': 'geoId/07',
                  'types': ['State']
              }]
          }
        elif prop == 'nearbyPlaces' and out:
          # Return nearby places
          return {
              nodes[0]: [{
                  'value': 'country/CAN@10km'
              }, {
                  'value': 'country/MEX@20km'
              }]
          }
        elif prop == 'member' and out:
          # For similar places (cohort)
          return {
              'PlacePagesComparisonCountriesCohort': [{
                  'dcid': 'country/GBR',
                  'types': ['Country']
              }, {
                  'dcid': 'country/AUS',
                  'types': ['Country']
              }]
          }
        else:
          return {node: [] for node in nodes}

      mock_raw_property_values.side_effect = mock_raw_property_values_side_effect

      # Send a GET request to the related-places endpoint
      response = app.test_client().get(
          f'/api/dev-place/related-places/{place_dcid}')

      # Check that the response is successful
      self.assertEqual(response.status_code, 200)

      # Parse the response JSON
      response_json = response.get_json()

      # Check that the response contains the expected fields
      self.assertIn('childPlaceType', response_json)
      self.assertIn('childPlaces', response_json)
      self.assertIn('nearbyPlaces', response_json)
      self.assertIn('place', response_json)
      self.assertIn('similarPlaces', response_json)

      # Check the place field
      self.assertEqual(response_json['place']['dcid'], place_dcid)
      self.assertEqual(response_json['place']['name'], f'Name of {place_dcid}')
      self.assertEqual(response_json['place']['types'], ['Country'])

      # Check lengths of the place lists
      self.assertEqual(len(response_json['childPlaces']), 2)
      self.assertEqual(len(response_json['nearbyPlaces']), 2)
      self.assertEqual(len(response_json['similarPlaces']), 2)

      # Check contents of childPlaces
      self.assertEqual(response_json['childPlaces'][0]['dcid'], 'geoId/06')
      self.assertEqual(response_json['childPlaces'][0]['name'],
                       'Name of geoId/06')
      self.assertEqual(response_json['childPlaces'][0]['types'], ['State'])

      # Check contents of nearbyPlaces
      self.assertEqual(response_json['nearbyPlaces'][0]['dcid'], 'country/CAN')
      self.assertEqual(response_json['nearbyPlaces'][0]['name'],
                       'Name of country/CAN')
      self.assertEqual(response_json['nearbyPlaces'][0]['types'], ['Country'])

      # Check contents of similarPlaces
      self.assertEqual(response_json['similarPlaces'][0]['dcid'], 'country/GBR')
      self.assertEqual(response_json['similarPlaces'][0]['name'],
                       'Name of country/GBR')
      self.assertEqual(response_json['similarPlaces'][0]['types'], ['Country'])

      # Check the 'childPlaceType' field
      self.assertEqual(response_json['childPlaceType'], "")

  @patch('server.routes.dev_place.utils.fetch.raw_property_values')
  @patch('server.routes.dev_place.utils.fetch.property_values')
  def test_related_places_es_locale(self, mock_property_values,
                                    mock_raw_property_values):
    """Test the /api/dev-place/related-places endpoint with 'es' locale."""
    with app.app_context():
      # Sample place_dcid
      place_dcid = 'country/USA'

      # Define side effects for mock_property_values
      def mock_property_values_side_effect(dcids, prop):
        result = {}
        for dcid in dcids:
          if prop == 'typeOf':
            if dcid == place_dcid:
              result[dcid] = ['Country']
            elif dcid in [
                'country/CAN', 'country/MEX', 'country/GBR', 'country/AUS'
            ]:
              result[dcid] = ['Country']
            elif dcid in ['geoId/06', 'geoId/07']:
              result[dcid] = ['State']
            else:
              result[dcid] = ['Place']
          elif prop == 'name':
            result[dcid] = [f'Name of {dcid}']
          elif prop == 'nameWithLanguage':
            # Provide Spanish names for certain places
            if dcid == place_dcid:
              result[dcid] = [f'Nombre de {dcid}@es']
            elif dcid in ['geoId/06', 'country/CAN']:
              result[dcid] = [f'Nombre de {dcid}@es']
            else:
              result[dcid] = []
          else:
            result[dcid] = []
        return result

      mock_property_values.side_effect = mock_property_values_side_effect

      # Define side effects for mock_raw_property_values
      def mock_raw_property_values_side_effect(nodes, prop, out):
        if prop == 'containedInPlace' and not out:
          # Return child places
          return {
              nodes[0]: [{
                  'dcid': 'geoId/06',
                  'types': ['State']
              }, {
                  'dcid': 'geoId/07',
                  'types': ['State']
              }]
          }
        elif prop == 'nearbyPlaces' and out:
          # Return nearby places
          return {
              nodes[0]: [{
                  'value': 'country/CAN@10km'
              }, {
                  'value': 'country/MEX@20km'
              }]
          }
        elif prop == 'member' and out:
          # For similar places (cohort)
          if nodes == ['PlacePagesComparisonCountriesCohort']:
            return {
                'PlacePagesComparisonCountriesCohort': [{
                    'dcid': 'country/GBR',
                    'types': ['Country']
                }, {
                    'dcid': 'country/AUS',
                    'types': ['Country']
                }]
            }
          else:
            return {node: [] for node in nodes}
        else:
          return {node: [] for node in nodes}

      mock_raw_property_values.side_effect = mock_raw_property_values_side_effect

      # Send a GET request to the api/dev-place/related-places endpoint with locale 'es'
      response = app.test_client().get(
          f'/api/dev-place/related-places/{place_dcid}?hl=es')

      # Check that the response is successful
      self.assertEqual(response.status_code, 200)

      # Parse the response JSON
      response_json = response.get_json()

      # Check that the response contains the expected fields
      self.assertIn('childPlaceType', response_json)
      self.assertIn('childPlaces', response_json)
      self.assertIn('nearbyPlaces', response_json)
      self.assertIn('place', response_json)
      self.assertIn('similarPlaces', response_json)

      # Check the place field
      self.assertEqual(response_json['place']['dcid'], place_dcid)
      # The name should be in Spanish if available
      self.assertEqual(response_json['place']['name'],
                       f'Nombre de {place_dcid}')
      self.assertEqual(response_json['place']['types'], ['Country'])

      # Check lengths of the place lists
      self.assertEqual(len(response_json['childPlaces']), 2)
      self.assertEqual(len(response_json['nearbyPlaces']), 2)
      self.assertEqual(len(response_json['similarPlaces']), 2)

      # Check contents of childPlaces
      # First child place should have Spanish name
      self.assertEqual(response_json['childPlaces'][0]['dcid'], 'geoId/06')
      self.assertEqual(response_json['childPlaces'][0]['name'],
                       'Nombre de geoId/06')
      self.assertEqual(response_json['childPlaces'][0]['types'], ['State'])
      # Second child place defaults to English name
      self.assertEqual(response_json['childPlaces'][1]['dcid'], 'geoId/07')
      self.assertEqual(response_json['childPlaces'][1]['name'],
                       'Name of geoId/07')
      self.assertEqual(response_json['childPlaces'][1]['types'], ['State'])

      # Check contents of nearbyPlaces
      # First child place should have Spanish name
      self.assertEqual(response_json['nearbyPlaces'][0]['dcid'], 'country/CAN')
      self.assertEqual(response_json['nearbyPlaces'][0]['name'],
                       'Nombre de country/CAN')
      self.assertEqual(response_json['nearbyPlaces'][0]['types'], ['Country'])

      # Check contents of similarPlaces
      # Similar places default to English names
      self.assertEqual(response_json['similarPlaces'][0]['dcid'], 'country/GBR')
      self.assertEqual(response_json['similarPlaces'][0]['name'],
                       'Name of country/GBR')
      self.assertEqual(response_json['similarPlaces'][0]['types'], ['Country'])

      # Check the 'childPlaceType' field
      self.assertEqual(response_json['childPlaceType'], "")
