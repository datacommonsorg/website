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
import tempfile
import unittest

from build_custom_dc_embeddings import EMBEDDINGS_CSV_FILENAME
from build_custom_dc_embeddings import EMBEDDINGS_YAML_FILE_NAME
import build_custom_dc_embeddings as builder
from sentence_transformers import SentenceTransformer
import utils

MODEL_NAME = "all-MiniLM-L6-v2"
INPUT_DIR = "testdata/customdc/input"
EXPECTED_DIR = "testdata/customdc/expected"


def _compare_files(test: unittest.TestCase, output_path, expected_path):
  with open(output_path) as gotf:
    got = gotf.read()
    with open(expected_path) as wantf:
      want = wantf.read()
      test.assertEqual(got, want)


class TestEndToEnd(unittest.TestCase):

  def test_build_embeddings_dataframe(self):
    self.maxDiff = None

    ctx = utils.Context(gs=None,
                        model=SentenceTransformer(MODEL_NAME),
                        bucket=None,
                        tmp="/tmp")

    input_dcids_sentences_csv_path = os.path.join(INPUT_DIR,
                                                  "dcids_sentences.csv")
    expected_dcids_sentences_csv_path = os.path.join(
        EXPECTED_DIR, "final_dcids_sentences.csv")

    with tempfile.TemporaryDirectory() as temp_dir:
      actual_dcids_sentences_csv_path = os.path.join(
          temp_dir, "final_dcids_sentences.csv")

      embeddings_df = builder.build_embeddings_dataframe(
          ctx, input_dcids_sentences_csv_path)

      embeddings_df[['dcid',
                     'sentence']].to_csv(actual_dcids_sentences_csv_path,
                                         index=False)

      _compare_files(self, actual_dcids_sentences_csv_path,
                     expected_dcids_sentences_csv_path)

  def test_build_embeddings_dataframe_and_validate(self):
    ctx = utils.Context(gs=None,
                        model=SentenceTransformer(MODEL_NAME),
                        bucket=None,
                        tmp="/tmp")

    input_dcids_sentences_csv_path = os.path.join(INPUT_DIR,
                                                  "dcids_sentences.csv")

    embeddings_df = builder.build_embeddings_dataframe(
        ctx, input_dcids_sentences_csv_path)

    # Test success == no failures during validation
    utils.validate_embeddings(embeddings_df, input_dcids_sentences_csv_path)

  def test_generate_yaml(self):
    expected_embeddings_yaml_path = os.path.join(EXPECTED_DIR,
                                                 EMBEDDINGS_YAML_FILE_NAME)
    fake_embeddings_csv_path = f"/fake/path/to/{EMBEDDINGS_CSV_FILENAME}"

    with tempfile.TemporaryDirectory() as temp_dir:
      actual_embeddings_yaml_path = os.path.join(temp_dir,
                                                 EMBEDDINGS_YAML_FILE_NAME)

      builder.generate_embeddings_yaml(fake_embeddings_csv_path,
                                       actual_embeddings_yaml_path)

      _compare_files(self, actual_embeddings_yaml_path,
                     expected_embeddings_yaml_path)
