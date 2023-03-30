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

from nl_server import query_util


class TestQueryUtil(unittest.TestCase):

  def test_get_parts_via_delimiters_versus(self):
    self.assertEqual(['compare male population', 'female population'],
                     query_util.get_parts_via_delimiters(
                         'compare male population vs female population'))

  def test_get_parts_via_delimiters_list(self):
    self.assertEqual(
        ['male population', 'female population', 'poor people', 'rich people'],
        query_util.get_parts_via_delimiters(
            'male population, female population and poor people & rich people'))

  def test_get_parts_via_delimiters_doublequotes(self):
    self.assertEqual(['male population', 'female population'],
                     query_util.get_parts_via_delimiters(
                         'compare "male population" with "female population"'))
