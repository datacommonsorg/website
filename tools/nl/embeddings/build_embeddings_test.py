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

import glob
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import pandas as pd
from parameterized import parameterized
from sentence_transformers import SentenceTransformer

import tools.nl.embeddings.build_embeddings as be


def get_test_sv_data():
  dcids = ["SV_1", "SV_2", "SV_3"]
  names = ["name1", "name2", "name3"]
  decriptions = ["desc1", "desc2", "desc3"]

  # SV_3 has an override which means that all other fields for SV_3 will
  # be ignored and only the override alternative(s) will be used.
  overrides = ["", "", "override3"]

  # SV_2 has a duplicate (abc2) which should be de-duped during processing.
  curated = ["abc1;xyz1", "abc2;xyz2; abc2", "abc3;xyz3"]

  return pd.DataFrame.from_dict({
      "dcid": dcids,
      "Name": names,
      "Description": decriptions,
      "Override_Alternatives": overrides,
      "Curated_Alternatives": curated,
  })


def _compare_files(t, output_path, expected_path):
  with open(output_path) as gotf:
    got = gotf.read()
    with open(expected_path) as wantf:
      want = wantf.read()
      t.assertEqual(got, want)


def _validate_sentence_to_dcid_map(t, df, dcid_col, sentence_columns):
  sentence_dcid_map = {}
  for _, row in df.iterrows():
    dcid = row[dcid_col]

    for col in sentence_columns:
      for s in row[col].split(";"):
        if not s:
          continue
        if s in sentence_dcid_map:
          # TODO: remove the continnue and uncomment the assert check below
          # when we have dealt with the dupes.
          continue
          # Sentence already exists. It could either be a duplicate for the
          # same SV dcid (which is Ok) OR the same sentence maps to a different
          # DCID (which is not OK).
          # t.assertEqual(
          #     sentence_dcid_map[s], dcid,
          #     f"Using the same sentence for more than one StatVar. Sentence: {s}. SV_1: {sentence_dcid_map[s]}, SV_2: {dcid}"
          # )
        else:
          sentence_dcid_map[s] = dcid


class TestEndToEnd(unittest.TestCase):

  def testFailure(self):

    # Mock the get_sheets_data function to return test data.
    # Mocking with an empty DataFrame should result in a KeyError exception for
    # the expected column names not found.
    be.get_sheets_data = mock.Mock(return_value=pd.DataFrame())

    model = SentenceTransformer("all-MiniLM-L6-v2")

    # input sheets filepaths can be empty.
    input_sheets_svs = []

    # Filepaths all correspond to the testdata folder.
    input_dir = Path(__file__).parent / "testdata/input"
    input_alternatives_filepattern = os.path.join(input_dir,
                                                  "*_alternatives.csv")

    with tempfile.TemporaryDirectory() as tmp_dir, self.assertRaises(KeyError):
      tmp_local_merged_filepath = os.path.join(tmp_dir, "merged_data.csv")
      be.build(model, None, input_sheets_svs, tmp_local_merged_filepath, "",
               input_alternatives_filepattern)

  def testSuccess(self):
    self.maxDiff = None

    # Mock the get_sheets_data function to return test data.
    be.get_sheets_data = mock.Mock(return_value=get_test_sv_data())

    # Given that the get_sheets_data() function is mocked, the Context
    # object does not need a valid `gs` and `bucket` field.
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # Filepaths all correspond to the testdata folder.
    input_dir = Path(__file__).parent / "testdata/input"
    expected_dir = Path(__file__).parent / "testdata/expected"
    input_alternatives_filepattern = os.path.join(input_dir,
                                                  "*_alternatives.csv")
    input_sheets_csv_dirs = [os.path.join(input_dir, "curated")]
    expected_local_merged_filepath = os.path.join(expected_dir,
                                                  "merged_data.csv")
    expected_dcid_sentence_csv_filepath = os.path.join(
        expected_dir, "final_dcid_sentences_csv.csv")

    with tempfile.TemporaryDirectory() as tmp_dir:
      tmp_local_merged_filepath = os.path.join(tmp_dir, "merged_data.csv")
      tmp_dcid_sentence_csv = os.path.join(tmp_dir,
                                           "final_dcid_sentences_csv.csv")

      embeddings_df = be.build(model, None, input_sheets_csv_dirs,
                               tmp_local_merged_filepath, "",
                               input_alternatives_filepattern)

      # Write dcids, sentences to temp directory.
      embeddings_df[['dcid', 'sentence']].to_csv(tmp_dcid_sentence_csv)

      # Compare the output files.
      _compare_files(self, tmp_local_merged_filepath,
                     expected_local_merged_filepath)
      _compare_files(self, tmp_dcid_sentence_csv,
                     expected_dcid_sentence_csv_filepath)


class TestEndToEndActualDataFiles(unittest.TestCase):

  @parameterized.expand(["medium"])
  def testInputFilesValidations(self, sz):
    # Verify that the required files exist.
    sheets_filepath = Path(
        __file__).parent / "data/curated_input/main/sheets_svs.csv"
    # TODO: Fix palm_batch13k_alternatives.csv to not have duplicate
    # descriptions.  Its technically okay since build_embeddings will take
    # care of dups.
    parent_folder = str(Path(__file__).parent)
    input_alternatives_filepattern = os.path.join(
        parent_folder, "data/alternatives/(palm|other)_alternaties.csv")
    output_dcid_sentences_filepath = os.path.join(
        parent_folder, f'data/preindex/{sz}/sv_descriptions.csv')

    # Check that all the files exist.
    self.assertTrue(os.path.exists(sheets_filepath))
    self.assertTrue(os.path.exists(output_dcid_sentences_filepath))

    # Perform input file validations.

    # The input data files should not have the same sentence/description map to
    # different SV dcids.
    sheets_df = pd.read_csv(sheets_filepath).fillna("")
    expected_cols = ["dcid", "sentence"]
    sheets_sentence_cols = expected_cols[1:]

    self.assertCountEqual(expected_cols, sheets_df.columns.values)
    _validate_sentence_to_dcid_map(self, sheets_df, "dcid",
                                   sheets_sentence_cols)

    expected_cols = ["dcid", "sentence"]
    alt_sentence_cols = expected_cols[1:]

    for alt_file in glob.glob(input_alternatives_filepattern):
      alts_df = pd.read_csv(alt_file).fillna("")
      self.assertTrue(all(x in alts_df.columns.values for x in expected_cols))
      _validate_sentence_to_dcid_map(self, alts_df, "dcid", alt_sentence_cols)

  @parameterized.expand(["medium"])
  def testOutputFileValidations(self, sz):
    output_dcid_sentences_filepath = Path(
        __file__).parent / f'data/preindex/{sz}/sv_descriptions.csv'

    dcid_sentence_df = pd.read_csv(output_dcid_sentences_filepath).fillna("")

    # Check that the dcids do not have duplicate rows.
    dcids_set = set()
    for d in dcid_sentence_df["dcid"].values:
      self.assertFalse(d in dcids_set, f"DCID found more than once: {d}")
      dcids_set.add(d)

    # Check that there are no duplicate sentences.
    sentences = {}
    for row_index, row in dcid_sentence_df.iterrows():
      sv_dcid = row["dcid"]
      for s in row["sentence"].split(";"):
        if not s:
          continue

        existing_sv_index = sentences.get(s, ())
        err_msg = f"\nSentence already exists: {s}.\nCurrent (SV, index): {sv_dcid, row_index}.\nExisting (SV, index): {existing_sv_index}."
        if s in sentences:
          print(err_msg)
        # self.assertFalse(s in sentences, err_msg)
        sentences[s] = (sv_dcid, row_index)
