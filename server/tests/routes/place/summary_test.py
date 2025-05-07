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
"""Unit tests for server.routes.place.summary."""

from typing import List, Tuple
import unittest
from unittest import mock

from flask import Flask
from flask import g
from flask_caching import Cache
import pytest

from server.routes.place.types import Place
import server.routes.place.utils as place_utils
from server.services import datacommons as dc


# Mock observations data
def generate_mock_obs_point_data(place_dcid: str,
                                 stat_var_data: List[Tuple[str, float, str]]):
  """Generates mock observation point data for testing.
  
  Args:
    stat_var_data: List of tuples containing (stat_var_dcid, value, date)
  
  Returns:
    Mock observation point data structure
  """
  result = {'byVariable': {}, 'facets': {}}

  for stat_var, value, date in stat_var_data:
    facet_id = str(abs(hash(stat_var)))

    result['byVariable'][stat_var] = {
        'byEntity': {
            place_dcid: {
                'orderedFacets': [{
                    'facetId': facet_id,
                    'observations': [{
                        'date': date,
                        'value': value
                    }],
                    'obsCount': 1,
                    'earliestDate': date,
                    'latestDate': date
                }]
            }
        }
    }

    result['facets'][facet_id] = {
        'importName': 'SomeImport',
        'provenanceUrl': 'https://www.example.org',
        'measurementMethod': 'Method'
    }

  return result


@pytest.fixture(scope="module")
def app():
  app = Flask(__name__)
  app.config['BABEL_DEFAULT_LOCALE'] = 'en'
  app.config['SERVER_NAME'] = 'example.com'
  app.config['CACHE_TYPE'] = 'null'
  return app


class TestPlaceSummary(unittest.IsolatedAsyncioTestCase):
  """Tests for the place summary api endpoint"""

  @pytest.fixture(autouse=True)
  def setup_app_context(self, request):
    """Setup the app context and cache for each test."""
    self.app = request.getfixturevalue('app')
    self.cache = Cache(self.app)
    self.app_context = self.app.app_context()

  def setUp(self):
    super().setUp()
    self.mock_obs_point = self.patch(dc, "obs_point")
    self.mock_fetch_place = self.patch(place_utils, "fetch_place")
    self.mock_get_parent_places = self.patch(place_utils, "get_parent_places")

  def tearDown(self):
    self.cache.clear()
    super().tearDown()

  def patch(self, module, name):
    patcher = mock.patch.object(module, name)
    mock_obj = patcher.start()
    self.addCleanup(patcher.stop)
    return mock_obj

  async def test_place_summary_90210(self):
    """Tests that the place summary for zip code 90210 succeeds."""
    with self.app.app_context():
      g.locale = 'en'

      # Mock place data
      place = Place(dcid='zip/90210',
                    name='90210',
                    types=['CensusZipCodeTabulationArea'],
                    dissolved=False)
      self.mock_fetch_place.return_value = place

      # Mock parent places
      parent_places = [
          Place(dcid='geoId/06037',
                name='Los Angeles County',
                types=['County', 'AdministrativeArea2'],
                dissolved=False),
          Place(dcid='geoId/06',
                name='California',
                types=['State', 'AdministrativeArea1'],
                dissolved=False),
          Place(dcid='country/USA',
                name='United States of America',
                types=['Country'],
                dissolved=False),
          Place(dcid='northamerica',
                name='North America',
                types=['Continent'],
                dissolved=False),
          Place(dcid='Earth', name='World', types=['Place'], dissolved=False)
      ]
      self.mock_get_parent_places.return_value = parent_places

      stat_var_data = [('Count_Person', 19652, '2023'),
                       ('Median_Age_Person', 51.2, '2023'),
                       ('Median_Income_Person', 78750, '2023'),
                       ('Percent_Person_Obesity', 21.6, '2022'),
                       ('Percent_Person_BingeDrinking', 17.3, '2022'),
                       ('Percent_Person_Smoking', 7.2, '2022')]

      self.mock_obs_point.return_value = generate_mock_obs_point_data(
          place.dcid, stat_var_data)

      expected_summary = "90210 is a census zip code tabulation area in California, United States of America. The population in 90210 was 19,652 in 2023. The median age in 90210 was 51.2 in 2023. The median income in 90210 was $78,750 in 2023. The percentage of people with obesity in 90210 was 21.6% in 2022. The percentage of people who binge drink in 90210 was 17.3% in 2022. The percentage of people who smoke in 90210 was 7.2% in 2022."

      actual_summary = await place_utils.generate_place_summary(
          place.dcid, g.locale)

      self.assertEqual(actual_summary, expected_summary)

  async def test_earth_summary(self):
    """Tests that the summary for Earth succeeds."""
    with self.app.app_context():
      g.locale = 'en'

      # Mock place data
      place = Place(dcid='Earth',
                    name='World',
                    types=['Place'],
                    dissolved=False)
      self.mock_fetch_place.return_value = place

      # Mock empty parent places for Earth
      self.mock_get_parent_places.return_value = []

      # Mock stat var data
      stat_var_data = [
          ('Count_Person', 8061876001, '2023'),
          ('Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita',
           13169.5982250474, '2023'),
          ('LifeExpectancy_Person', 73.3274749596, '2023'),
          ('Amount_Consumption_Energy_PerCapita', 1851.1913613881, '2022'),
          ('Amount_Emissions_CarbonDioxide_PerCapita', 4.6781023168, '2023')
      ]

      self.mock_obs_point.return_value = generate_mock_obs_point_data(
          place.dcid, stat_var_data)

      expected_summary = " The population in World was 8,061,876,001 in 2023. The nominal GDP per capita in World was $13,169.6 in 2023. The life expectancy in World was 73.33 in 2023. The energy consumption per capita in World was 1,851.19kgoe in 2022. The carbon dioxide emissions per capita in World was 4.68t in 2023."

      actual_summary = await place_utils.generate_place_summary(
          place.dcid, g.locale)

      self.assertEqual(actual_summary, expected_summary)

  async def test_usa_summary(self):
    """Tests that the summary for USA succeeds."""
    with self.app.app_context():
      g.locale = 'en'

      # Mock place data
      place = Place(dcid='country/USA',
                    name='United States of America',
                    types=['Country'],
                    dissolved=False)
      self.mock_fetch_place.return_value = place

      # Mock parent places
      parent_places = [
          Place(dcid='northamerica',
                name='North America',
                types=['Continent'],
                dissolved=False),
          Place(dcid='Earth', name='World', types=['Place'], dissolved=False)
      ]
      self.mock_get_parent_places.return_value = parent_places

      # Mock stat var data
      stat_var_data = [
          ('Count_Person', 340110988, '2024'),
          ('Median_Age_Person', 38.7, '2023'),
          ('Median_Income_Person', 39982, '2023'),
          ('UnemploymentRate_Person', 4.2, '2025'),
          ('Amount_EconomicActivity_GrossDomesticProduction_Nominal_PerCapita',
           82769.4122114216, '2023'),
          ('GiniIndex_EconomicActivity', 41.3, '2022'),
          ('LifeExpectancy_Person', 78.3853658537, '2023'),
          ('Percent_Person_Obesity', 33.4, '2022'),
          ('Percent_Person_BingeDrinking', 18.0, '2022'),
          ('Percent_Person_Smoking', 13.2, '2022'),
          ('Amount_Consumption_Energy_PerCapita', 6428.3633702355, '2023'),
          ('Amount_Emissions_CarbonDioxide_PerCapita', 13.9797885072, '2023')
      ]

      self.mock_obs_point.return_value = generate_mock_obs_point_data(
          place.dcid, stat_var_data)

      expected_summary = "The United States of America is a country in North America. The population in the United States of America was 340,110,988 in 2024. The median age in the United States of America was 38.7 in 2023. The median income in the United States of America was $39,982 in 2023. The unemployment rate in the United States of America was 4.2% in 2025. The nominal GDP per capita in the United States of America was $82,769.41 in 2023. The Gini index in the United States of America was 41.3 in 2022. The life expectancy in the United States of America was 78.39 in 2023. The percentage of people with obesity in the United States of America was 33.4% in 2022. The percentage of people who binge drink in the United States of America was 18% in 2022. The percentage of people who smoke in the United States of America was 13.2% in 2022. The energy consumption per capita in the United States of America was 6,428.36kgoe in 2023. The carbon dioxide emissions per capita in the United States of America was 13.98t in 2023."

      actual_summary = await place_utils.generate_place_summary(
          place.dcid, g.locale)

      self.assertEqual(actual_summary, expected_summary)
