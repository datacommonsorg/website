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

import unittest

from diskcache import Cache
from parameterized import parameterized

from nl_server.loader import nl_cache_path
from nl_server.loader import nl_ner_cache_key
from nl_server.ner_place_model import NERPlaces


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
      ["tell me about chicago", ["chicago"]],
      ["what about new delhi", ["new delhi"]],
      ["California economy and Florida", ["california", "florida"]],
      [
          "the place to live is Singapore or Hong Kong",
          ["singapore", "hong kong"]
      ],
      ["life expectancy in Australia and Canada", ["australia", "canada"]],
      [
          "why is it always raining in seattle and in London",
          ["seattle", "london"]
      ],
  ])
  def test_heuristic_detection(self, query_str, expected):
    # Covert all detected place string to lower case.
    got = self.nl_ner_model.detect_places_ner(query_str)
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
