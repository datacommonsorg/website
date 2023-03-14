# Copyright 2023 Google LLC
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
"""Tests for DC Place Recognition."""

import unittest

from diskcache import Cache
from parameterized import parameterized

from nl_server.loader import nl_cache_path
from nl_server.loader import nl_place_recog_key
from nl_server.place_recognition import DcPlaceRecognition


class TestDcPlaceRecognition(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:

    # Look for the Embeddings model in the cache if it exists.
    cache = Cache(nl_cache_path)
    cache.expire()
    cls.place_recog = cache.get(nl_place_recog_key)
    if not cls.place_recog:
      print(
          "Could not load DcPlaceRecognition from the cache for these tests. Loading a new object."
      )
      # Using the default NER model.
      cls.place_recog = DcPlaceRecognition()

  @parameterized.expand([
      # All these queries should detect places.
      # Starting with several special cases (continents, US etc).
      [
          "median income in africa",
          [{
              'span': 'median income in'
          }, {
              'places': ['africa'],
              'span': 'africa'
          }]
      ],
      [
          "economy of Asia",
          [{
              'places': ['geoId/4222264', 'geoId/1820152'],
              'span': 'economy'
          }, {
              'span': 'of'
          }, {
              'places': ['asia'],
              'span': 'Asia'
          }]
      ],
      [
          "tell me about chicago",
          [{
              'span': 'tell me about'
          }, {
              'places': ['geoId/1714000'],
              'span': 'chicago'
          }]
      ],
      [
          "tell me about palo alto",
          [{
              'span': 'tell me about'
          }, {
              'places': ['geoId/0655282', 'geoId/1961230', 'geoId/4257752'],
              'span': 'palo alto'
          }]
      ],
      [
          "what about mountain view",
          [{
              'span': 'what about'
          }, {
              'places': ['geoId/0649670', 'geoId/3744770', 'geoId/1553300'],
              'span': 'mountain view'
          }]
      ],
      [
          "crime in new york state",
          [{
              'span': 'crime in'
          }, {
              'places': ['geoId/36', 'geoId/3651000'],
              'span': 'new york'
          }, {
              'span': 'state'
          }]
      ],
      [
          "California economy and Florida",
          [{
              'places': ['geoId/06', 'geoId/2412150', 'geoId/4210768'],
              'span': 'California'
          }, {
              'places': ['geoId/4222264', 'geoId/1820152'],
              'span': 'economy'
          }, {
              'span': 'and'
          }, {
              'places': ['geoId/12', 'geoId/72054', 'geoId/3626319'],
              'span': 'Florida'
          }]
      ],
      [
          "life expectancy in Australia and Canada",
          [{
              'span': 'life expectancy in'
          }, {
              'places': ['country/AUS'],
              'span': 'Australia'
          }, {
              'span': 'and'
          }, {
              'places': ['country/CAN'],
              'span': 'Canada'
          }]
      ],
      [
          "life expectancy in New York city and Alabama",
          [{
              'span': 'life expectancy in'
          }, {
              'places': ['geoId/36', 'geoId/3651000'],
              'span': 'New York'
          }, {
              'span': 'city and'
          }, {
              'places': ['geoId/01'],
              'span': 'Alabama'
          }]
      ],
      [
          "the birds in San Jose are chirpy",
          [{
              'span': 'the birds in'
          }, {
              'places': ['geoId/0668000', 'geoId/3568430', 'geoId/0463260'],
              'span': 'San Jose'
          }, {
              'span': 'are chirpy'
          }]
      ],
      [
          "the birds in San Jose, California are chirpy",
          [{
              'span': 'the birds in'
          }, {
              'places': ['geoId/06', 'geoId/0668000', 'geoId/2412150'],
              'span': 'San Jose , California'
          }, {
              'span': 'are chirpy'
          }]
      ],
      [
          "the birds in San Jose California are chirpy",
          [{
              'span': 'the birds in'
          }, {
              'places': ['geoId/06', 'geoId/0668000', 'geoId/2412150'],
              'span': 'San Jose California'
          }, {
              'span': 'are chirpy'
          }]
      ],
      [
          "the birds in San Jose, Mountain View and Sunnyvale are chirpy",
          [{
              'span': 'the birds in'
          }, {
              'places': ['geoId/0668000', 'geoId/3568430', 'geoId/0463260'],
              'span': 'San Jose'
          }, {
              'span': ','
          }, {
              'places': ['geoId/0649670', 'geoId/3744770', 'geoId/1553300'],
              'span': 'Mountain View'
          }, {
              'span': 'and'
          }, {
              'places': ['geoId/0677000', 'geoId/4871156'],
              'span': 'Sunnyvale'
          }, {
              'span': 'are chirpy'
          }]
      ],
  ])
  def test_place_recognition(self, query_str, expected):
    try:
      got = self.place_recog.detect_places(query_str)
      self.assertEqual(got, expected)
    except Exception as e:
      self.assertTrue(False, f"Unexpected Exception raised: {e}")
