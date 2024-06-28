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
"""Tests for query_util."""

import unittest

from parameterized import parameterized

from server.lib.nl.detection.query_util import get_parts_via_delimiters
from server.lib.nl.detection.query_util import prepare_multivar_querysets
from server.lib.nl.detection.query_util import QuerySet
from server.lib.nl.detection.query_util import QuerySplit


class TestGetPartsViaDelimiters(unittest.TestCase):

  def test_get_parts_via_delimiters_versus(self):
    self.assertEqual([
        'compare male population', 'female population'
    ], get_parts_via_delimiters('compare male population vs female population'))

  def test_get_parts_via_delimiters_list(self):
    self.assertEqual(
        ['male population', 'female population', 'poor people', 'rich people'],
        get_parts_via_delimiters(
            'male population, female population and poor people & rich people'))

  def test_get_parts_via_delimiters_doublequotes(self):
    self.assertEqual(['male population', 'female population'],
                     get_parts_via_delimiters(
                         'compare "male population" with "female population"'))


class TestPrepareMultivarQuerysets(unittest.TestCase):

  @parameterized.expand([
      [
          'number of poor hispanic women with phd',
          [
              QuerySet(
                  nsplits=2,
                  delim_based=False,
                  combinations=[
                      QuerySplit(
                          parts=['number', 'of poor hispanic women phd']),
                      QuerySplit(
                          parts=['number of', 'poor hispanic women phd']),
                      QuerySplit(
                          parts=['number of poor', 'hispanic women phd']),
                      QuerySplit(
                          parts=['number of poor hispanic', 'women phd']),
                      QuerySplit(parts=['number of poor hispanic women', 'phd'])
                  ]),
              QuerySet(
                  nsplits=3,
                  delim_based=False,
                  combinations=[
                      QuerySplit(
                          parts=['number', 'of', 'poor hispanic women phd']),
                      QuerySplit(
                          parts=['number', 'of poor', 'hispanic women phd']),
                      QuerySplit(
                          parts=['number', 'of poor hispanic', 'women phd']),
                      QuerySplit(
                          parts=['number', 'of poor hispanic women', 'phd']),
                      QuerySplit(
                          parts=['number of', 'poor', 'hispanic women phd']),
                      QuerySplit(
                          parts=['number of', 'poor hispanic', 'women phd']),
                      QuerySplit(
                          parts=['number of', 'poor hispanic women', 'phd']),
                      QuerySplit(
                          parts=['number of poor', 'hispanic', 'women phd']),
                      QuerySplit(
                          parts=['number of poor', 'hispanic women', 'phd']),
                      QuerySplit(
                          parts=['number of poor hispanic', 'women', 'phd']),
                  ]),
              QuerySet(
                  nsplits=4,
                  delim_based=False,
                  combinations=[
                      QuerySplit(
                          parts=['number', 'of', 'poor', 'hispanic women phd']),
                      QuerySplit(
                          parts=['number', 'of', 'poor hispanic', 'women phd']),
                      QuerySplit(
                          parts=['number', 'of', 'poor hispanic women', 'phd']),
                      QuerySplit(
                          parts=['number', 'of poor', 'hispanic', 'women phd']),
                      QuerySplit(
                          parts=['number', 'of poor', 'hispanic women', 'phd']),
                      QuerySplit(
                          parts=['number', 'of poor hispanic', 'women', 'phd']),
                      QuerySplit(
                          parts=['number of', 'poor', 'hispanic', 'women phd']),
                      QuerySplit(
                          parts=['number of', 'poor', 'hispanic women', 'phd']),
                      QuerySplit(
                          parts=['number of', 'poor hispanic', 'women', 'phd']),
                      QuerySplit(
                          parts=['number of poor', 'hispanic', 'women', 'phd'])
                  ])
          ],
      ],
      # [
      #     'compare obesity vs. poverty',
      #     [
      #         QuerySet(nsplits=2,
      #                  delim_based=True,
      #                  combinations=[QuerySplit(parts=['obesity', 'poverty'])]),
      #     ],
      # ],
      # [
      #     'show me the impact of climate change on drought',
      #     [
      #         QuerySet(nsplits=2,
      #                  delim_based=False,
      #                  combinations=[
      #                      QuerySplit(parts=['show', 'climate change drought']),
      #                      QuerySplit(parts=['show climate', 'change drought']),
      #                      QuerySplit(parts=['show climate change', 'drought'])
      #                  ]),
      #         QuerySet(
      #             nsplits=3,
      #             delim_based=False,
      #             combinations=[
      #                 QuerySplit(parts=['show', 'climate', 'change drought']),
      #                 QuerySplit(parts=['show', 'climate change', 'drought']),
      #                 QuerySplit(parts=['show climate', 'change', 'drought'])
      #             ]),
      #         QuerySet(
      #             nsplits=4,
      #             delim_based=False,
      #             combinations=[
      #                 QuerySplit(parts=['show', 'climate', 'change', 'drought'])
      #             ])
      #     ]
      # ],
      # [
      #     'Compare "Male population" with "Female Population"',
      #     [
      #         QuerySet(
      #             nsplits=2,
      #             delim_based=True,
      #             combinations=[
      #                 QuerySplit(parts=['male population', 'female population'])
      #             ]),
      #         QuerySet(
      #             nsplits=3,
      #             delim_based=False,
      #             combinations=[
      #                 QuerySplit(
      #                     parts=['male', 'population', 'female population']),
      #                 QuerySplit(
      #                     parts=['male', 'population female', 'population']),
      #                 QuerySplit(
      #                     parts=['male population', 'female', 'population'])
      #             ]),
      #         QuerySet(
      #             nsplits=4,
      #             delim_based=False,
      #             combinations=[
      #                 QuerySplit(
      #                     parts=['male', 'population', 'female', 'population'])
      #             ])
      #     ]
      # ]
  ])
  def test_prepare_multivar_querysets(self, query, expected):
    self.maxDiff = None
    self.assertEqual(prepare_multivar_querysets(query, max_svs=4), expected)
