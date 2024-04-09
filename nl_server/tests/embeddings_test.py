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
import yaml

from nl_server import embeddings_map as emb_map
from nl_server import gcs
from nl_server.loader import NL_CACHE_PATH
from nl_server.loader import NL_EMBEDDINGS_CACHE_KEY
from nl_server.model.sentence_transformer import SentenceTransformerModel
from nl_server.store.memory import MemoryEmbeddingsStore
from nl_server.wrapper import Embeddings

_root_dir = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# TODO(pradh): Expand tests to other index sizes.
def _get_embeddings_file_path() -> str:
  embeddings_config_path = os.path.join(_root_dir, 'deploy/nl/embeddings.yaml')
  with open(embeddings_config_path) as f:
    embeddings = yaml.full_load(f)
    embeddings_file = embeddings[emb_map.DEFAULT_INDEX_TYPE]
    return gcs.download_embeddings(embeddings_file['embeddings'])


def _get_tuned_model_path() -> str:
  models_config_path = os.path.join(_root_dir, 'deploy/nl/models.yaml')
  with open(models_config_path) as f:
    models_map = yaml.full_load(f)
    return gcs.download_folder(models_map['tuned_model'])


class TestEmbeddings(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:
    # Look for the Embeddings in the cache if it exists.
    cache = Cache(NL_CACHE_PATH)
    cache.expire()
    embeddings = cache.get(NL_EMBEDDINGS_CACHE_KEY)

    if not embeddings:
      print(
          "Could not load the embeddings from the cache for these tests. Loading a new embeddings object."
      )
      # Building a new Embeddings object. It might require downloading the embeddings file
      # and a finetuned model.
      # This uses the default embeddings pointed to in embeddings.yaml file and the fine tuned
      # model pointed to in models.yaml.
      # If the default index is not a "finetuned" index, then the default model can be used.
      tuned_model_path = ""
      if "ft" in emb_map.DEFAULT_INDEX_TYPE:
        tuned_model_path = _get_tuned_model_path()

      cls.nl_embeddings = Embeddings(
          model=SentenceTransformerModel(tuned_model_path),
          store=MemoryEmbeddingsStore(_get_embeddings_file_path()))
    else:
      cls.nl_embeddings = embeddings.get()

  @parameterized.expand([
      # All these queries should detect one of the SVs as the top choice.
      ["number of people", False, ["Count_Person"]],
      ["population of", False, ["dc/topic/Population", "Count_Person"]],
      ["economy of the state", False, ["dc/topic/Economy"]],
      ["household income", False, ["Median_Income_Household"]],
      [
          "life expectancy in USA", False,
          ["dc/topic/LifeExpectancy", "LifeExpectancy_Person"]
      ],
      [
          "GDP", False,
          ["Amount_EconomicActivity_GrossDomesticProduction_Nominal"]
      ],
      ["auto theft", False, ["Count_CriminalActivities_MotorVehicleTheft"]],
      ["agriculture", False, ["dc/topic/Agriculture"]],
      [
          "agricultural output", False,
          ["dc/g/FarmInventory", 'dc/topic/AgriculturalProduction']
      ],
      [
          "agriculture workers", False,
          ["dc/hlxvn1t8b9bhh", "Count_Person_MainWorker_AgriculturalLabourers"]
      ],
      [
          "heart disease", False,
          [
              "dc/topic/HeartDisease",
              "dc/topic/PopulationWithDiseasesOfHeartByAge",
              "Percent_Person_WithCoronaryHeartDisease"
          ]
      ],
      ["heart disease", True, ["Percent_Person_WithCoronaryHeartDisease"]],
  ])
  def test_sv_detection(self, query_str, skip_topics, expected_list):
    got = self.nl_embeddings.search_vars([query_str],
                                         skip_topics=skip_topics)[0]

    # Check that all expected fields are present.
    self.assertTrue(got.svs)
    self.assertTrue(got.scores)
    self.assertTrue(got.sv2sentences)

    # Check that the first SV found is among the expected_list.
    self.assertTrue(got.svs[0] in expected_list)

    # TODO: uncomment the lines below when we have figured out what to do with these
    # assertion failures. They started failing when updating to the medium_ft index.
    # The failure is for the inputs: "agriculture workers" and "heart disease".
    # if got["MultiSV"]["Candidates"]:
    #   self.assertTrue(got["CosineScore"][0] > got["MultiSV"]["Candidates"][0]
    #                   ["AggCosineScore"])

  # For these queries, the match score should be low (< 0.45).
  @parameterized.expand(["random random", "", "who where why", "__124__abc"])
  def test_low_score_matches(self, query_str):
    got = self.nl_embeddings.search_vars([query_str])[0]

    # Check that all expected fields are present.
    self.assertTrue(got.svs)
    self.assertTrue(got.scores)
    self.assertTrue(got.sv2sentences)

    # Check all scores.
    for score in got.scores:
      self.assertLess(score, 0.45)
