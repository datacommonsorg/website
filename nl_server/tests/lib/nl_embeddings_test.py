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
"""Tests for Embeddings (in nl_embeddings.py)."""

from diskcache import Cache
from lib.nl_embeddings import Embeddings
from nl_server import nl_cache_path, nl_embeddings_cache_key
from parameterized import parameterized

import unittest


class TestEmbeddings(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:

    # Look for the Embeddings model in the cache if it exists.
    cache = Cache(nl_cache_path)
    cache.expire()
    cls.nl_embeddings = cache.get(nl_embeddings_cache_key)
    if not cls.nl_embeddings:
      print(
          "Could not load the embeddings from the cache for these tests. Loading a new embeddings object."
      )
      # Using the default NER model.
      cls.nl_embeddings = Embeddings()

  @parameterized.expand([
      # All these queries should detect the SV as the top choice.
      ["number of people", "Count_Person"],
      ["population of", "Count_Person"],
      ["economy of the state", "dc/topic/Economy"],
      ["household income", "Median_Income_Household"],
      ["life expectancy in USA", "LifeExpectancy_Person"],
      ["GDP", "Amount_EconomicActivity_GrossDomesticProduction_Nominal"],
      ["auto theft", "Count_CriminalActivities_MotorVehicleTheft"],
      ["agriculture", "dc/topic/Agriculture"],
      ["agricultural output", "dc/g/FarmInventory"],
      ["agriculture workers", "dc/hlxvn1t8b9bhh"],
      ["heart disease", "dc/g/Person_MedicalCondition-CoronaryHeartDisease"]
  ])
  def test_sv_detection(self, query_str, expected):
    got = self.nl_embeddings.detect_svs(query_str)

    # Check that all expected fields are present.
    for key in ["SV", "CosineScore", "EmbeddingIndex", "SV_to_Sentences"]:
      self.assertTrue(key in got.keys())

    # Check for the first SV.
    self.assertEqual(expected, got["SV"][0])

  # For these queries, the match score should be low (< 0.4).
  @parameterized.expand(["random random", "", "who where why", "__124__abc"])
  def test_low_score_matches(self, query_str):
    got = self.nl_embeddings.detect_svs(query_str)

    # Check that all expected fields are present.
    for key in ["SV", "CosineScore", "EmbeddingIndex", "SV_to_Sentences"]:
      self.assertTrue(key in got.keys())

    # Check all scores.
    for score in got['CosineScore']:
      self.assertLess(score, 0.4)
