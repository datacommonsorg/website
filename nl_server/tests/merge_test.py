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
"""Tests for EmbeddingsResult merging."""

import unittest

from parameterized import parameterized

from nl_server.embeddings import EmbeddingsMatch
from nl_server.merge import merge_search_results


class TestMerge(unittest.TestCase):

  @parameterized.expand([[
      [{
          'not poor': [
              EmbeddingsMatch(sentence='poverty',
                              score=0.85,
                              vars=['WHO_Poverty']),
              EmbeddingsMatch(sentence='families that are poor',
                              score=0.75,
                              vars=['Household_BelowPovertyLevel']),
              EmbeddingsMatch(sentence='above poverty',
                              score=0.7,
                              vars=['WHO_AbovePoverty']),
          ]
      }, {
          'not poor': [
              EmbeddingsMatch(sentence='below poverty',
                              score=0.9,
                              vars=['Count_BelowPovertyLevel']),
              EmbeddingsMatch(sentence='above poverty',
                              score=0.8,
                              vars=['Count_AbovePovertyLevel']),
              EmbeddingsMatch(sentence='poor households',
                              score=0.7,
                              vars=['Household_BelowPovertyLevel']),
          ]
      }],
      {
          'not poor': [
              EmbeddingsMatch(sentence='below poverty',
                              score=0.9,
                              vars=['Count_BelowPovertyLevel']),
              EmbeddingsMatch(sentence='poverty',
                              score=0.85,
                              vars=['WHO_Poverty']),
              EmbeddingsMatch(sentence='above poverty',
                              score=0.8,
                              vars=['Count_AbovePovertyLevel']),
              EmbeddingsMatch(sentence='families that are poor',
                              score=0.75,
                              vars=['Household_BelowPovertyLevel']),
              EmbeddingsMatch(sentence='above poverty',
                              score=0.7,
                              vars=['WHO_AbovePoverty']),
              # This has the same score as above, but appears 2nd.
              EmbeddingsMatch(sentence='poor households',
                              score=0.7,
                              vars=['Household_BelowPovertyLevel']),
          ]
      }
  ]])
  def test_main(self, input, want):
    got = merge_search_results(input)
    self.assertEqual(want, got)
