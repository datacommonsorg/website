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

from enum import Enum
import os
import shutil
import unittest

from parameterized import parameterized

from nl_server import config
from nl_server import embeddings_map as emb_map
from nl_server.config import EmbeddingsIndex
from nl_server.wrapper import Embeddings
from shared.lib.constants import SV_SCORE_DEFAULT_THRESHOLD
from shared.lib.gcs import TEMP_DIR

_test_data = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          'test_data')

_DEFAULT_FILE: str = 'default.ft_final_v20230717230459.all-MiniLM-L6-v2.csv'
_CUSTOM_FILE: str = 'custom.ft_final_v20230717230459.all-MiniLM-L6-v2.csv'
_TUNED_MODEL: str = 'ft_final_v20230717230459.all-MiniLM-L6-v2'


class DCType(str, Enum):
  MAIN = "main"
  CUSTOM = "custom"


def _copy(fname: str):
  dst = os.path.join(TEMP_DIR, fname)
  shutil.copy(os.path.join(_test_data, fname), dst)
  return dst


def _test_query(test: unittest.TestCase, idx: Embeddings, query: str,
                expected: str):
  trimmed_svs = []
  if idx:
    got = idx.search_vars([query])[0]
    for i in range(len(got.svs)):
      if got.scores[i] >= SV_SCORE_DEFAULT_THRESHOLD:
        trimmed_svs.append(got.svs[i])

  if not expected:
    test.assertTrue(not trimmed_svs, trimmed_svs)
  else:
    test.assertEqual([expected], trimmed_svs)


class TestEmbeddings(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:
    cls.default_file = _copy(_DEFAULT_FILE)
    cls.custom_file = _copy(_CUSTOM_FILE)

    cls.main = emb_map.EmbeddingsMap(
        config.load({'medium_ft': cls.default_file},
                    {'tuned_model': _TUNED_MODEL}))

    cls.custom = emb_map.EmbeddingsMap(
        config.load(
            {
                'medium_ft': cls.default_file,
                'custom_ft': cls.custom_file,
            }, {'tuned_model': _TUNED_MODEL}))

  def test_entries(self):
    self.assertEqual(1, len(self.main.get('medium_ft').store.dcids))
    self.assertTrue(not self.main.get('custom_ft'))
    # Custom DC should merge base + custom embeddings.
    self.assertEqual(2, len(self.custom.get('medium_ft').store.dcids))
    self.assertEqual(1, len(self.custom.get('custom_ft').store.dcids))

  #
  # MAIN DC content:
  # * default index: dc/topic/sdg_1
  # CUSTOM DC content:
  # * default index: dc/topic/sdg_1 + dc/topic/sdg_2
  # * custom index: dc/topic/sdg_2
  #
  @parameterized.expand([
      # Main DC
      [DCType.MAIN, 'money', 'medium_ft', 'dc/topic/sdg_1'],
      [DCType.MAIN, 'food', 'medium_ft', ''],
      [DCType.MAIN, 'money', 'custom_ft', ''],
      [DCType.MAIN, 'food', 'custom_ft', ''],
      # Custom DC
      [DCType.CUSTOM, 'money', 'medium_ft', 'dc/topic/sdg_1'],
      [DCType.CUSTOM, 'food', 'medium_ft', 'dc/topic/sdg_2'],
      [DCType.CUSTOM, 'money', 'custom_ft', ''],
      [DCType.CUSTOM, 'food', 'custom_ft', 'dc/topic/sdg_2'],
  ])
  def test_queries(self, dc: DCType, query: str, index: str, expected: str):
    if dc == DCType.MAIN:
      idx = self.main.get(index)
    else:
      idx = self.custom.get(index)

    _test_query(self, idx, query, expected)

  def test_merge_custom_embeddings(self):
    embeddings = emb_map.EmbeddingsMap(
        config.load({'medium_ft': self.default_file},
                    {'tuned_model': _TUNED_MODEL}))

    _test_query(self, embeddings.get("medium_ft"), "money", "dc/topic/sdg_1")
    _test_query(self, embeddings.get("medium_ft"), "food", "")

    custom_idx = EmbeddingsIndex(name="custom_ft",
                                 embeddings_path=_CUSTOM_FILE,
                                 embeddings_local_path=os.path.join(
                                     TEMP_DIR, _CUSTOM_FILE))

    embeddings.merge_custom_index(custom_idx)

    _test_query(self, embeddings.get("medium_ft"), "money", "dc/topic/sdg_1")
    _test_query(self, embeddings.get("medium_ft"), "food", "dc/topic/sdg_2")
