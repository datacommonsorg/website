# Copyright 2024 Google LLC
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
"""Tests for rerank."""

from dataclasses import dataclass
from typing import List
import unittest

from parameterized import parameterized

from nl_server import rerank
from shared.lib.detected_variables import dict_to_var_candidates
from shared.lib.detected_variables import var_candidates_to_dict


class TestReank(unittest.TestCase):

  @parameterized.expand([
      [
          'population sans health insurance',
          # Original result has insured before uninsured.
          {
              'SV': [
                  'Count_Person_HealthInsurance',
                  'Count_Person_NoHealthInsurance',
              ],
              'CosineScore': [
                  0.989,
                  0.978,
              ],
              'SV_to_Sentences': {
                  'Count_Person_HealthInsurance': [
                      {
                          'sentence': 'number of people with health insurance',
                          'score': 0.989
                      },
                      {
                          'sentence': 'insured population',
                          'score': 0.898
                      },
                  ],
                  'Count_Person_NoHealthInsurance': [
                      {
                          'sentence':
                              'number of people without health insurance',
                          'score':
                              0.978
                      },
                      {
                          'sentence': 'uninsured population',
                          'score': 0.898
                      },
                  ]
              }
          },
          # The reranker should have the query with every sentence
          # in the order of SVs.
          [
              [
                  'population sans health insurance',
                  'number of people with health insurance'
              ],
              ['population sans health insurance', 'insured population'],
              [
                  'population sans health insurance',
                  'number of people without health insurance'
              ],
              ['population sans health insurance', 'uninsured population'],
          ],
          # The order here would be sentences in SV order.
          [3, 1, 4, 2],
          # The expected result should have uninsured before insured.
          {
              'SV': [
                  'Count_Person_NoHealthInsurance',
                  'Count_Person_HealthInsurance',
              ],
              'CosineScore': [
                  0.978,
                  0.989,
              ],
              'SV_to_Sentences': {
                  'Count_Person_HealthInsurance': [
                      {
                          'sentence': 'number of people with health insurance',
                          'score': 0.989,
                          'rerank_score': 3
                      },
                      {
                          'sentence': 'insured population',
                          'score': 0.898,
                          'rerank_score': 1,
                      },
                  ],
                  'Count_Person_NoHealthInsurance': [
                      {
                          'sentence':
                              'number of people without health insurance',
                          'score':
                              0.978,
                          'rerank_score':
                              4,
                      },
                      {
                          'sentence': 'uninsured population',
                          'score': 0.898,
                          'rerank_score': 2,
                      },
                  ]
              }
          },
      ],
  ])
  def test_main(self, query, input_candidates, want_api_input, api_return,
                want):
    dummy_logs = {}
    self.maxDiff = None

    class RerankModel:

      def predict(local_self, got_api_input):
        self.assertEqual(want_api_input, got_api_input)
        return api_return

    got = rerank.rerank(
        rerank_model=RerankModel(),
        query2candidates={query: dict_to_var_candidates(input_candidates)},
        debug_logs=dummy_logs)

    self.assertEqual(want, var_candidates_to_dict(got[query]))
