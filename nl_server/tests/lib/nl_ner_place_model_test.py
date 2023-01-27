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

from diskcache import Cache
from lib.nl_ner_place_model import NERPlaces
from parameterized import parameterized

import unittest


class TestNERPlaces(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:

    # Look for the Embeddings model in the cache if it exists.
    nl_ner_cache_key = 'nl_ner'
    nl_cache_path = '~/.datacommons/'
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
    # Using the default NER model.
    detector = self.nl_ner_model

    # Covert all detected place string to lower case.
    got = [s.lower() for s in detector.detect_places_ner(query_str)]
    self.assertEqual(expected, got)

  @parameterized.expand([
      # Providing wrong types of ner models. Each should lead to an exception.
      [
          "str instead of model",
          "random query",
      ],
      [
          "str instead of model",
          "California",
      ],
      [[], "population Florida"],
      [{}, "United States"],
  ])
  def test_ner_failure(self, ner_model, query_str):
    detector = NERPlaces(ner_model=ner_model)

    with self.assertRaises(Exception):
      detector.detect_places_ner(query_str)

  @parameterized.expand(
      # All these are valid queries even if they do not detect a Place.
      # There should be no exceptions.
      ["random", "California", "United States", "America", "", "."])
  def test_ner_default(self, query_str):
    detector = self.nl_ner_model
    try:
      detector.detect_places_ner(query_str)
    except Exception as e:
      self.assertTrue(False, f"Unexpected Exception raised: {e}")
