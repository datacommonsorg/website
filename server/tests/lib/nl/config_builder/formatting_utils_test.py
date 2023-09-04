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
"""Unit tests for display text formatting for charts."""

import unittest
from parameterized import parameterized

import server.lib.nl.config_builder.formatting_utils as formatting


class TestFormatting(unittest.TestCase):

  @parameterized.expand([
      ("USA population in May, 2021", "USA Population in May, 2021"),
      ("Max concentration: carbon Monoxide",
       "Max Concentration: Carbon Monoxide"),
      ("max Concentration: nitrogen dioxide",
       "Max Concentration: Nitrogen Dioxide"),
      ("max concentration: PM 10", "Max Concentration: PM 10"),
      ("max PM2.5 concentration", "Max PM2.5 Concentration"),
      ("Max Concentration: Sulfur Dioxide",
       "Max Concentration: Sulfur Dioxide"),
      ("Maximum temperature", "Maximum Temperature"),
      ("Mean area Of farm", "Mean Area of Farm"),
      ("10th distict in florida and california are wealthy",
       "10th Distict in Florida and California Are Wealthy"),
      ("10th distict in florida_and_california are wealthy",
       "10th Distict in Florida_And_California Are Wealthy"),
  ])
  def test_title_case_formatting(self, sentence, expected):
    got = formatting.make_title_case(sentence)
    self.assertEqual(got, expected)

  @parameterized.expand([
      ("USA population in May, 2021.", "USA population in may, 2021."),
      ("Max concentration: carbon Monoxide",
       "Max concentration: carbon monoxide."),
      ("max Concentration: nitrogen dioxide",
       "Max concentration: nitrogen dioxide."),
      ("max concentration: PM 10", "Max concentration: PM 10."),
      ("max PM2.5 concentration", "Max PM2.5 concentration."),
      ("Max Concentration: Sulfur Dioxide",
       "Max concentration: sulfur dioxide."),
      ("Maximum temperature RCP4.5, SSP245",
       "Maximum temperature RCP4.5, SSP245."),
      ("Mean area Of farm", "Mean area of farm."),
      ("Mean area Is W/m2", "Mean area is W/m2."),
      ("mean area was not right. but the correct volume was measured",
       "Mean area was not right. But the correct volume was measured."),
      ("10th distict in florida and california are wealthy",
       "10th distict in florida and california are wealthy."),
      ("10th distict in florida_and_california are wealthy",
       "10th distict in florida_and_california are wealthy."),
  ])
  def test_sentence_case_formatting(self, sentence, expected):
    got = formatting.make_sentence_case(sentence)
    self.assertEqual(got, expected)
