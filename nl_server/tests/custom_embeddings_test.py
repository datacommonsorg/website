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
"""Tests for Custom Embeddings."""

import os
import shutil
from typing import List
import unittest

from parameterized import parameterized

from nl_server import embeddings_map as emb_map
from nl_server.config import parse
from nl_server.embeddings import Embeddings
from nl_server.search import search_vars
from shared.lib.constants import SV_SCORE_DEFAULT_THRESHOLD
from shared.lib.gcs import TEMP_DIR

_test_data = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          'test_data')

_DEFAULT_FILE: str = 'default.ft_final_v20230717230459.all-MiniLM-L6-v2.csv'
_CUSTOM_FILE: str = 'custom.ft_final_v20230717230459.all-MiniLM-L6-v2.csv'
_TUNED_MODEL_NAME: str = 'ft_final_v20230717230459'
_TUNED_MODEL_GCS: str = 'gs://datcom-nl-models/ft_final_v20230717230459.all-MiniLM-L6-v2'


def _copy(fname: str):
  dst = os.path.join(TEMP_DIR, fname)
  shutil.copy(os.path.join(_test_data, fname), dst)
  return dst


def _test_query(test: unittest.TestCase, indexes: List[Embeddings], query: str,
                expected: str):
  trimmed_svs = []
  if indexes:
    got = search_vars(indexes, [query])[query]
    for i, m in enumerate(got.svs):
      if got.scores[i] >= SV_SCORE_DEFAULT_THRESHOLD:
        trimmed_svs.append(m)

  if not expected:
    test.assertTrue(not trimmed_svs, trimmed_svs)
  else:
    test.assertEqual([expected], trimmed_svs)


class TestEmbeddings(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:
    cls.default_file = _copy(_DEFAULT_FILE)
    cls.custom_file = _copy(_CUSTOM_FILE)

    cls.custom = emb_map.EmbeddingsMap(
        parse(
            {
                'version': 1,
                'indexes': {
                    'medium_ft': {
                        'embeddings': cls.default_file,
                        'store': 'MEMORY',
                        'model': _TUNED_MODEL_NAME
                    },
                    'custom_ft': {
                        'embeddings': cls.custom_file,
                        'store': 'MEMORY',
                        'model': _TUNED_MODEL_NAME
                    }
                },
                'models': {
                    _TUNED_MODEL_NAME: {
                        'type': 'LOCAL',
                        'usage': 'EMBEDDINGS',
                        'gcs_folder': _TUNED_MODEL_GCS
                    }
                }
            }, {}, False))

  def test_entries(self):
    self.assertEqual(1, len(self.custom.get_index('medium_ft').store.dcids))
    self.assertEqual(1, len(self.custom.get_index('custom_ft').store.dcids))

  #
  # * default index: dc/topic/sdg_1
  # * custom index: dc/topic/sdg_2
  #
  @parameterized.expand([
      ['money', 'medium_ft', 'dc/topic/sdg_1'],
      ['food', 'medium_ft', 'dc/topic/sdg_2'],
      ['money', 'custom_ft', ''],
      ['food', 'custom_ft', 'dc/topic/sdg_2'],
  ])
  def test_queries(self, query: str, index: str, expected: str):
    if index == 'medium_ft':
      indexes = [
          self.custom.get_index('custom_ft'),
          self.custom.get_index('medium_ft')
      ]
    else:
      indexes = [self.custom.get_index('custom_ft')]

    _test_query(self, indexes, query, expected)

  def test_merge_custom_embeddings(self):
    embeddings = emb_map.EmbeddingsMap(
        parse(
            {
                'version': 1,
                'indexes': {
                    'medium_ft': {
                        'embeddings': self.default_file,
                        'store': 'MEMORY',
                        'model': _TUNED_MODEL_NAME
                    },
                },
                'models': {
                    _TUNED_MODEL_NAME: {
                        'type': 'LOCAL',
                        'usage': 'EMBEDDINGS',
                        'gcs_folder': _TUNED_MODEL_GCS
                    }
                }
            }, {}, False))

    _test_query(self, [embeddings.get_index("medium_ft")], "money",
                "dc/topic/sdg_1")
    _test_query(self, [embeddings.get_index("medium_ft")], "food", "")

    embeddings.reset_index(
        parse(
            {
                'version': 1,
                'indexes': {
                    'custom_ft': {
                        'embeddings': self.custom_file,
                        'store': 'MEMORY',
                        'model': _TUNED_MODEL_NAME
                    },
                },
                'models': {
                    _TUNED_MODEL_NAME: {
                        'type': 'LOCAL',
                        'usage': 'EMBEDDINGS',
                        'gcs_folder': _TUNED_MODEL_GCS
                    }
                }
            }, {}, False))

    emb_list = [
        embeddings.get_index("custom_ft"),
        embeddings.get_index("medium_ft")
    ]
    _test_query(self, emb_list, "money", "dc/topic/sdg_1")
    _test_query(self, emb_list, "food", "dc/topic/sdg_2")
