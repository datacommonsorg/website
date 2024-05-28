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

from nl_server.config import LocalModelConfig
from nl_server.config import MemoryIndexConfig
from nl_server.config import ServerConfig
from nl_server.embeddings import Embeddings
from nl_server.registry import Registry
from nl_server.search import search_vars
from shared.lib.constants import SV_SCORE_DEFAULT_THRESHOLD

_test_data = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          'test_data')

_DEFAULT_FILE: str = 'default.ft_final_v20230717230459.all-MiniLM-L6-v2.csv'
_CUSTOM_FILE: str = 'custom.ft_final_v20230717230459.all-MiniLM-L6-v2.csv'
_TUNED_MODEL_NAME: str = 'ft_final_v20230717230459'
_TUNED_MODEL_GCS: str = 'gs://datcom-nl-models/ft_final_v20230717230459.all-MiniLM-L6-v2'
_TEMP_DIR = '/tmp'


def _copy(fname: str):
  dst = os.path.join(_TEMP_DIR, fname)
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

    server_config = ServerConfig(version='1',
                                 default_indexes=['medium_ft'],
                                 indexes={
                                     'medium_ft':
                                         MemoryIndexConfig(
                                             store_type='MEMORY',
                                             model=_TUNED_MODEL_NAME,
                                             embeddings_path=cls.default_file,
                                         ),
                                     'custom_ft':
                                         MemoryIndexConfig(
                                             store_type='MEMORY',
                                             model=_TUNED_MODEL_NAME,
                                             embeddings_path=cls.custom_file,
                                         )
                                 },
                                 models={
                                     _TUNED_MODEL_NAME:
                                         LocalModelConfig(
                                             type='LOCAL',
                                             gcs_folder=_TUNED_MODEL_GCS,
                                             usage='EMBEDDINGS',
                                         )
                                 },
                                 enable_reranking=False)

    cls.custom = Registry(server_config)

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
    server_config = ServerConfig(version='1',
                                 default_indexes=['medium_ft'],
                                 indexes={
                                     'medium_ft':
                                         MemoryIndexConfig(
                                             store_type='MEMORY',
                                             model=_TUNED_MODEL_NAME,
                                             embeddings_path=self.default_file,
                                         )
                                 },
                                 models={
                                     _TUNED_MODEL_NAME:
                                         LocalModelConfig(
                                             type='LOCAL',
                                             gcs_folder=_TUNED_MODEL_GCS,
                                             usage='EMBEDDINGS',
                                         )
                                 },
                                 enable_reranking=False)
    registry: Registry = Registry(server_config)
    _test_query(self, [registry.get_index("medium_ft")], "money",
                "dc/topic/sdg_1")
    _test_query(self, [registry.get_index("medium_ft")], "food", "")

    server_config.indexes['custom_ft'] = MemoryIndexConfig(
        store_type='MEMORY',
        model=_TUNED_MODEL_NAME,
        embeddings_path=self.custom_file,
    )
    registry.load(server_config)

    emb_list = [
        registry.get_index("custom_ft"),
        registry.get_index("medium_ft")
    ]
    _test_query(self, emb_list, "money", "dc/topic/sdg_1")
    _test_query(self, emb_list, "food", "dc/topic/sdg_2")
