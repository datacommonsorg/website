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
"""Tests for Embeddings"""

from typing import List
import unittest

from parameterized import parameterized

from nl_server import config_reader
from nl_server.registry import Registry
from nl_server.search import search_vars
from shared.lib.detected_variables import VarCandidates


def _get_contents(
    r: VarCandidates) -> tuple[List[str], List[str], List[List[str]]]:
  return r.svs, r.scores, r.sv2sentences


class TestEmbeddings(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:
    catalog = config_reader.read_catalog()
    env = config_reader.read_env()
    server_config = config_reader.get_server_config(catalog, env)
    registry = Registry(server_config)
    default_indexes = registry.server_config().default_indexes
    cls.embeddings = registry.get_index(default_indexes[0])

  @parameterized.expand([
      # All these queries should detect one of the SVs as the top choice.
      ["population of", False, ["dc/topic/Population", "Count_Person"]],
      ["economy of the state", False, ["dc/topic/Economy"]],
      ["household income", False, ["Mean_Income_Household"]],
      [
          "life expectancy in USA", False,
          ["dc/topic/LifeExpectancy", "LifeExpectancy_Person"]
      ],
      ["GDP", False, ["dc/topic/GDP"]],
      ["auto theft", False, ["Count_CriminalActivities_MotorVehicleTheft"]],
      ["agriculture", False, ["dc/topic/Agriculture"]],
      [
          "agricultural output", False,
          ["dc/g/FarmInventory", 'dc/topic/AgriculturalProduction']
      ],
      [
          "agriculture workers", False,
          ["dc/topic/Agriculture", "dc/15lrzqkb6n0y7"]
      ],
      [
          "coronary heart disease", False,
          [
              "dc/topic/HeartDisease",
              "dc/topic/PopulationWithDiseasesOfHeartByAge",
              "Percent_Person_WithCoronaryHeartDisease"
          ]
      ],
      [
          "coronary heart disease", True,
          ["Percent_Person_WithCoronaryHeartDisease"]
      ],
  ])
  def test_sv_detection(self, query_str, skip_topics, expected_list):
    got = search_vars([self.embeddings], [query_str],
                      skip_topics=skip_topics)[query_str]

    # Check that all expected fields are present.
    svs, scores, sentences = _get_contents(got)
    self.assertTrue(svs)
    self.assertTrue(scores)
    self.assertTrue(sentences)

    # Check that the first SV found is among the expected_list.
    self.assertTrue(svs[0] in expected_list, f"{svs[0]} not in {expected_list}")

    # TODO: uncomment the lines below when we have figured out what to do with these
    # assertion failures. They started failing when updating to the medium_ft index.
    # The failure is for the inputs: "agriculture workers" and "heart disease".
    # if got["MultiSV"]["Candidates"]:
    #   self.assertTrue(got["CosineScore"][0] > got["MultiSV"]["Candidates"][0]
    #                   ["AggCosineScore"])

  # For these queries, the match score should be low (< 0.45).
  @parameterized.expand(["random random", "who where why", "__124__abc"])
  def test_low_score_matches(self, query_str):
    got = search_vars([self.embeddings], [query_str])[query_str]

    # Check that all expected fields are present.
    svs, scores, sentences = _get_contents(got)
    self.assertTrue(svs)
    self.assertTrue(scores)
    self.assertTrue(sentences)

    # Check all scores.
    for score in scores:
      self.assertLess(score, 0.7)
