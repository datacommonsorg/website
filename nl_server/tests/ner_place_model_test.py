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
"""Tests for NERPlaces (in nl_ner_place_model.py)."""

import re
import unittest

from diskcache import Cache
from parameterized import parameterized

from nl_server.loader import nl_cache_path
from nl_server.loader import nl_ner_cache_key
from nl_server.ner_place_model import NERPlaces
import server.lib.nl.utils as nl_utils


def _remove_punctuations(s):
  s = s.replace('\'s', '')
  s = re.sub(r'[^\w\s]', ' ', s)
  return " ".join(s.split())


class TestNERPlaces(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:

    # Look for the Embeddings model in the cache if it exists.
    cache = Cache(nl_cache_path)
    cache.expire()
    cls.nl_ner_model = cache.get(nl_ner_cache_key)
    if not cls.nl_ner_model:
      print(
          "Could not load NERPlaces from the cache for these tests. Loading a new NERPlaces object."
      )
      # Using the default NER model.
      cls.nl_ner_model = NERPlaces()

  @parameterized.expand([
      # All these queries should detect places.
      # Starting with several special cases (continents, US etc).
      ["GDP of Africa", ["africa"]],
      ["median income in africa", ["africa"]],
      ["GDP of countries in asia", ["asia"]],
      ["economy of Asia", ["asia"]],
      ["poverty in oceania", ["oceania"]],
      ["travel in south america", ["south america"]],
      ["income in latin america", ["latin america"]],
      ["population of north america", ["north america"]],
      ["climate change in north america cities", [
          "north america",
      ]],
      ["tell me about chicago", ["chicago"]],
      ["what about new delhi", ["new delhi"]],
      ["gdp of USA", ["usa"]],
      ["america's gnp", ["america"]],
      ["poverty in the us", ["us"]],
      [
          "states with the best places to live in the united states",
          ["united states"]
      ],
      ["tell me about palo alto", ["palo alto"]],
      ["what about mountain view", ["mountain view"]],
      ["population of states in the US", ["us"]],
      ["population of US states", ["us"]],
      ["population of the US", ["us"]],
      ["United States population", ["united states"]],
      ["US median income", ["us"]],
      ["US states with high median income", ["us"]],
      ["states US with high median income", ["us"]],
      ["USA states with high median income", ["usa"]],
      ["states USA with high median income", ["usa"]],
      ["population of mexico city", ["mexico city"]],
      ["crime in new york state", ["new york state"]],
      # Bay Area special cases
      [
          "cities with the highest african american population in the sf bay area",
          ["sf bay area"]
      ],
      [
          "cities with asian american population in the san francisco bay area",
          ["san francisco bay area"]
      ],
      ["cities with people in the SF peninsula", ["sf peninsula"]],
      ["crime in the SF east bay", ["sf east bay"]],
      [
          "SF east bay's and California's population",
          ["sf east bay", "california"]
      ],
      [
          "Asian population in the SF north bay and in California and in Asia",
          ["sf north bay", "california", "asia"]
      ],
      # Order of detection matters.
      [
          "the place to live is Singapore or Hong Kong",
          ["singapore", "hong kong"]
      ],
      [
          "cambridge's economy and Berkeley's",
          ["cambridge", "berkeley"],
      ],
      ["California economy and Florida", ["california", "florida"]],
      ["life expectancy in Australia and Canada", ["australia", "canada"]],
      [
          "why is it always raining in seattle and in London",
          ["seattle", "london"]
      ],
      [
          "life expectancy in New York city and Alabama",
          ["new york city", "alabama"]
      ],
      ["berkeley's economy and mountain view's", ["berkeley", "mountain view"]],
      # Check that the full place string is detected.
      ["tell me about Placer county", ["placer county"]],
      ["tell me about Santa Clara county", ["santa clara county"]],
      ["median income in Santa Clara County", ["santa clara county"]],
      ["family earnings in santa Clara county", ["santa clara county"]],
      ["Santa Clara county's population", ["santa clara county"]],
      [
          "Santa Clara county's population and San Mateo county",
          ["santa clara county", "san mateo county"]
      ],
      ["life expectancy in New York city", ["new york city"]],
      [
          "life expectancy in New York city and New York state",
          ["new york city", "new york state"]
      ],
  ])
  def test_heuristic_detection(self, query_str, expected):
    got = nl_utils.place_detection_with_heuristics(
        self.nl_ner_model.detect_places_ner, query_str)
    self.assertEqual(expected, got)

  @parameterized.expand(
      # All these are valid queries even if they do not detect a Place.
      # There should be no exceptions.
      ["random", "California", "United States", "America", "", "."])
  def test_ner_default(self, query_str):
    try:
      self.nl_ner_model.detect_places_ner(query_str)
    except Exception as e:
      self.assertTrue(False, f"Unexpected Exception raised: {e}")
