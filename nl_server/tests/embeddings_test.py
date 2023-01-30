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
from embeddings import Embeddings
from loader import nl_cache_path, nl_embeddings_cache_key
from parameterized import parameterized

import os
import unittest
import yaml


def _get_embeddings_file_name() -> str:
  model_config_path = os.path.abspath(
      os.path.join(os.path.curdir, '..', 'deploy/base/model.yaml'))
  with open(model_config_path) as f:
    model = yaml.full_load(f)
    return model['embeddings_file']


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
      cls.nl_embeddings = Embeddings(_get_embeddings_file_name())

  @parameterized.expand([
      # All these queries should detect one of the SVs as the top choice.
      ["number of people", ["Count_Person"]],
      ["population of", ["Count_Person"]],
      ["economy of the state", ["dc/topic/Economy"]],
      ["household income", ["Median_Income_Household"]],
      ["life expectancy in USA", ["LifeExpectancy_Person"]],
      ["GDP", ["Amount_EconomicActivity_GrossDomesticProduction_Nominal"]],
      ["auto theft", ["Count_CriminalActivities_MotorVehicleTheft"]],
      ["agriculture", ["dc/topic/Agriculture"]],
      [
          "agricultural output",
          ["dc/g/FarmInventory", 'dc/topic/AgriculturalProduction']
      ],
      ["agriculture workers", ["dc/hlxvn1t8b9bhh"]],
      ["heart disease", ["dc/g/Person_MedicalCondition-CoronaryHeartDisease"]],
  ])
  def test_sv_detection(self, query_str, expected_list):
    got = self.nl_embeddings.detect_svs(query_str)

    # Check that all expected fields are present.
    for key in ["SV", "CosineScore", "EmbeddingIndex", "SV_to_Sentences"]:
      self.assertTrue(key in got.keys())

    # Check that the first SV found is among the expected_list.
    self.assertTrue(got["SV"][0] in expected_list)

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
