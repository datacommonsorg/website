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
"""Tests for verbs (in nl_attribute_model.py)."""

import unittest

from parameterized import parameterized

from nl_server.model.attribute_model import AttributeModel


class TestVerbs(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:
    cls.nl_model = AttributeModel()

  @parameterized.expand([
      # All these queries should detect places.
      # Starting with several special cases (continents, US etc).
      ['GDP of Africa', []],
      ['median income in africa', []],
      ['tell me about palo alto', ['tell']],
      [
          'give me an example (real essay) about short term and long term goals for an MBA applciation',
          ['give']
      ],
      [('Elaborate  how  your  roles  in  management  accounting  covering  – '
        'planning,  organizing  and directing,  and  controlling  can  assist '
        'the  above  organization  in  achieving  their  goals  and objectives.'
       ), ['covering', 'organizing', 'controlling', 'assist', 'achieving']],
      ['How to write scholarship essay', ['write']]
  ])
  def test_verb_detection(self, query_str, expected):
    got = self.nl_model.detect_verbs(query_str)
    self.assertEqual(expected, got)
