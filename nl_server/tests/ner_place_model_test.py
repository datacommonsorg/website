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
from loader import nl_cache_path
from loader import nl_ner_cache_key
from ner_place_model import NERPlaces
from parameterized import parameterized


def _remove_punctuations(s):
  s = s.replace('\'s', '')
  s = re.sub(r'[^\w\s]', ' ', s)
  return " ".join(s.split())


# The function below is similar to the one under server.lib.nl.place_detection.py
# It performs similar heuristics (punctuation removal, title casing, ending with a period)
# which are also performed in the NL Interface.
def _detect_places_heuristics(ner_model, query):
  # Run through all heuristics (various query string transforms).
  query = _remove_punctuations(query)
  query_with_period = query + "."
  query_title_case = query.title()

  places_found = []
  # Now try all versions of the query.
  for q in [query, query_with_period, query_title_case]:
    for p in ner_model.detect_places_ner(q):
      if (p.lower() not in places_found):
        places_found.append(p.lower())

  places_to_return = []
  # Check if any of the detected place strings are entirely contained inside
  # another detected string. If so, give the longer place string preference.
  # Example: in the query "how about new york state", if both "new york" and
  # "new york state" are detected, then prefer "new york state". Similary for
  # "new york city", "san mateo county", "santa clara county" etc.
  for i in range(0, len(places_found)):
    ignore = False
    for j in range(0, len(places_found)):
      if i == j:
        continue
      # Checking if the place at index i is contained entirely inside
      # another place at index j != 1. If so, it can be ignored.
      if places_found[i] in places_found[j]:
        ignore = True
    if not ignore:
      places_to_return.append(places_found[i])

  return places_to_return


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
      # Check that the full place string is detected.
      ["tell me about Santa Clara county", ["santa clara county"]],
      ["median income in Santa Clara County", ["santa clara county"]],
      ["family earnings in santa Clara county", ["santa clara county"]],
      ["Santa Clara county's population", ["santa clara county"]],
      [
          "Santa Clara county's population and San Mateo county",
          ["santa clara county", "san mateo county"]
      ],
      ["life expectancy in New York city", ["new york city"]],
      ["life expectancy in New York city and New York", ["new york city"]],
      [
          "life expectancy in New York city and New York state",
          ["new york city", "new york state"]
      ],
  ])
  def test_heuristic_detection(self, query_str, expected):
    # Covert all detected place string to lower case.
    got = _detect_places_heuristics(self.nl_ner_model, query_str)
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
