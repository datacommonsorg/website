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
import yaml

from nl_server import config
from nl_server import embeddings
from nl_server import embeddings_store as store
from nl_server import gcs
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


class TestEmbeddings(unittest.TestCase):

  @classmethod
  def setUpClass(cls) -> None:
    tuned_model_path = gcs.download_model_folder(_TUNED_MODEL)
    default_idx = config.EmbeddingsIndex(
        name='medium_ft',
        embeddings_file_name=_DEFAULT_FILE,
        embeddings_local_path=_copy(_DEFAULT_FILE),
        tuned_model=_TUNED_MODEL,
        tuned_model_local_path=tuned_model_path)
    custom_idx = config.EmbeddingsIndex(
        name='custom',
        embeddings_file_name=_CUSTOM_FILE,
        embeddings_local_path=_copy(_CUSTOM_FILE),
        tuned_model=_TUNED_MODEL,
        tuned_model_local_path=tuned_model_path)
    cls.main = store.Store([default_idx])
    cls.custom = store.Store([default_idx, custom_idx])

  def test_entries(self):
    self.assertEqual(1, len(self.main.get('medium_ft').dcids))
    self.assertTrue(not self.main.get('custom'))
    self.assertEqual(2, len(self.custom.get('medium_ft').dcids))
    self.assertEqual(1, len(self.custom.get('custom').dcids))

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
      [DCType.MAIN, 'money', 'custom', ''],
      [DCType.MAIN, 'food', 'custom', ''],
      # Custom DC
      [DCType.CUSTOM, 'money', 'medium_ft', 'dc/topic/sdg_1'],
      [DCType.CUSTOM, 'food', 'medium_ft', 'dc/topic/sdg_2'],
      [DCType.CUSTOM, 'money', 'custom', ''],
      [DCType.CUSTOM, 'food', 'custom', 'dc/topic/sdg_2'],
  ])
  def test_queries(self, dc, query, index, expected):
    if dc == DCType.MAIN:
      idx = self.main.get(index)
    else:
      idx = self.custom.get(index)

    trimmed_svs = []
    if idx:
      got = idx.detect_svs(query)
      for i in range(len(got['SV'])):
        if got['CosineScore'][i] >= embeddings._SV_SCORE_THRESHOLD:
          trimmed_svs.append(got['SV'][i])

    if not expected:
      self.assertTrue(not trimmed_svs), trimmed_svs
    else:
      self.assertEqual([expected], trimmed_svs)
