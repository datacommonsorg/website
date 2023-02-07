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

import os
import unittest

from diskcache import Cache
from parameterized import parameterized
from sklearn.metrics.pairwise import cosine_similarity
import yaml

from nl_server.embeddings import Embeddings
from nl_server.loader import nl_cache_path
from nl_server.loader import nl_embeddings_cache_key

_root_dir = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _get_embeddings_file_name() -> str:
  model_config_path = os.path.join(_root_dir, 'deploy/base/model.yaml')
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

  def test_embedding_vector_same_dimension(self):
    q1 = ""  # empty string
    q2 = "A sentence used to query"

    q1_embedding = self.nl_embeddings.get_embedding(q1)
    q2_embedding = self.nl_embeddings.get_embedding(q2)

    self.assertEqual(len(q1_embedding), len(q2_embedding))

  @parameterized.expand([
      # q1 and q2 should be most similar to each other. q3 is different.
      [
          "number of people in australia", "population of australia",
          "heart disease in australia"
      ],
      [
          "life expectancy", "expected number of years to live",
          "expected temperature rise"
      ],
      ["median income of women", "average income of girls", "income of males"],
      [
          "economy of USA", "economic indicators in the United States",
          "number of graduates in the US"
      ],
      ["agriculture output", "farm produce", "banking and insurance"],
  ])
  def test_embedding_vector_similarity(self, q1, q2, q3):
    q1_embedding = self.nl_embeddings.get_embedding(q1)
    q2_embedding = self.nl_embeddings.get_embedding(q2)
    q3_embedding = self.nl_embeddings.get_embedding(q3)

    sim_1_2 = cosine_similarity([q1_embedding], [q2_embedding])
    sim_1_3 = cosine_similarity([q1_embedding], [q3_embedding])
    sim_2_3 = cosine_similarity([q2_embedding], [q3_embedding])

    self.assertGreater(sim_1_2, sim_1_3)
    self.assertGreater(sim_1_2, sim_2_3)
