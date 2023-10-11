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
"""Tests for verbs (in nl_attribute_model.py)."""

import logging
import unittest

from diskcache import Cache
from parameterized import parameterized

from nl_server.loader import nl_cache_path
from nl_server.loader import nl_model_cache_key
from nl_server.nl_attribute_model import NLAttributeModel


class TestVerbs(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:

    # Look for the Embeddings model in the cache if it exists.
    cache = Cache(nl_cache_path)
    cache.expire()
    cls.nl_model = cache.get(nl_model_cache_key)
    if not cls.nl_model:
      logging.error(
          'Could not load model from the cache for these tests. Loading a new model object.'
      )
      # Using the default model.
      cls.nl_model = NLAttributeModel()

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
        'planning,  organizing  and directing,  and  controlling  can  assist'
        'the  above  organization  in  achieving  their  goals  and objectives.'
       ),
       [
           'Elaborate', 'covering', 'organizing', 'directing', 'controlling',
           'achieving'
       ]],
      ['How to write scholarship essay', ['write']]
  ])
  def test_verb_detection(self, query_str, expected):
    got = self.nl_model.detect_verbs(query_str)
    self.assertEqual(expected, got)
