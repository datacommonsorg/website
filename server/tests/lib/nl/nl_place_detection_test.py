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
"""Tests for nl_place_detection."""

from parameterized import parameterized

import unittest

from lib.nl.nl_place_detection import NLPlaceDetector


class TestPlaceDetector(unittest.TestCase):

  @parameterized.expand([
      # All these queries should detect places.
      ["tell me about chicago", ["chicago"]],
      ["what about new delhi", ["new delhi"]],
      ["California's economy and and florida's", ["california", "florida"]],
      [
          "the place to live is singapore or hong kong",
          ["singapore", "hong kong"]
      ],
      ["life expectancy in australia and canada", ["australia", "canada"]],
      ["why is it always raining in seattle and london", ["seattle", "london"]],
      # Order of detection matters.
      ["cambridge's economy and Berkeley's", ["cambridge", "berkeley"]],
      ["berkeley's economy and cambridge's", ["berkeley", "cambridge"]],
      # Special places.
      ["tell me about palo alto", ["palo alto"]],
      ["what about mountain view", ["mountain view"]],
      # Special places are always detected first.
      ["berkeley's economy and mountain view's", ["mountain view", "berkeley"]],
  ])
  def test_heuristic_detection(self, query_str, expected):
    # Using the default NER model.
    detector = NLPlaceDetector()

    # Covert all detected place string to lower case.
    got = [s.lower() for s in detector.detect_places_heuristics(query_str)]
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
    detector = NLPlaceDetector(ner_model=ner_model)

    with self.assertRaises(Exception):
      detector.detect_place_ner(query_str)

  @parameterized.expand(
      # All these are valid queries even if they do not detect a Place.
      # There should be no exceptions.
      ["random", "California", "United States", "America", "", "."])
  def test_ner_default(self, query_str):
    # Not setting the NER model should produce a valid default.
    detector = NLPlaceDetector()
    try:
      detector.detect_place_ner(query_str)
    except Exception as e:
      self.assertTrue(False, f"Unexpected Exception raised: {e}")

  @parameterized.expand(
      # All these are valid queries even if they do not detect a Place.
      # There should be no exceptions.
      ["random", "California", "United States", "America", "", "."])
  def test_ner_default_no_exceptions(self, query_str):
    # Not setting the NER model should produce a valid default.
    detector = NLPlaceDetector()
    try:
      detector.detect_place_ner(query_str)
    except Exception as e:
      self.assertTrue(False, f"Unexpected Exception raised: {e}")
