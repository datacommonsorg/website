# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
from pathlib import Path
import tempfile
import unittest

import pandas as pd
from sentence_transformers import SentenceTransformer

from tools.nl.embeddings import build_custom_dc_embeddings as builder

MODEL_NAME = "all-MiniLM-L6-v2"
INPUT_DIR = Path(__file__).parent / "testdata/custom_dc/input"
EXPECTED_DIR = Path(__file__).parent / "testdata/custom_dc/expected"


def _compare_files(test: unittest.TestCase, output_path, expected_path):
  df1 = pd.read_csv(output_path)
  df2 = pd.read_csv(expected_path)
  test.assertEqual(df1['dcid'].tolist(), df2['dcid'].tolist())
  test.assertEqual(df1['sentence'].tolist(), df2['sentence'].tolist())


class TestEndToEnd(unittest.TestCase):

  def setUp(self):
    self.maxDiff = None
    self.model = SentenceTransformer(MODEL_NAME)
    self.input_file_path = os.path.join(INPUT_DIR, "dcids_sentences.csv")

  def test_build_embeddings_dataframe(self):
    expected_embeddings_path = os.path.join(EXPECTED_DIR,
                                            builder.EMBEDDINGS_FILE_NAME)

    with tempfile.TemporaryDirectory() as temp_dir:
      actual_embeddings_path = os.path.join(temp_dir, "embeddings.csv")
      builder.build(self.model, self.input_file_path, actual_embeddings_path)
      _compare_files(self, expected_embeddings_path, actual_embeddings_path)
