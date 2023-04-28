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
from unittest import mock

import build_embeddings_v2 as be
import pandas as pd
from sentence_transformers import SentenceTransformer


def get_test_sv_data():
  dcids = ["SV_1", "SV_2", "SV_3", "SV_4"]
  names = ["name1", "name2", "name3", "name4"]
  decriptions = ["desc1", "desc2", "desc3", "desc4"]

  # SV_3 has an override which means that all other fields for SV_3 will
  # be ignored and only the override alternative(s) will be used.
  overrides = ["", "", "override3", ""]

  # SV_2 has a duplicate (abc2) which should be de-duped during processing.
  curated = ["abc1;xyz1", "abc2;xyz2; abc2", "abc3;xyz3", "abc4;xyz4"]

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
          # Sentence already exists. It could either be a duplicate for the
          # same SV dcid (which is Ok) OR the same sentence maps to a different
          # DCID (which is not OK).
          t.assertEqual(
              sentence_dcid_map[s], dcid,
              f"Using the same sentence for more than one StatVar. Sentence: {s}. SV_1: {sentence_dcid_map[s]}, SV_2: {dcid}"
          )
        else:
          sentence_dcid_map[s] = dcid


class TestEndToEnd(unittest.TestCase):

  def testFailure(self):

    # Mock the get_sheets_data function to return test data.
    # Mocking with an empty DataFrame should result in a KeyError exception for
    # the expected column names not found.
    be.get_sheets_data = mock.Mock(return_value=pd.DataFrame())

    # Given that the get_sheets_data() function is mocked, the Context
    # object does not need a valid `gs` and `bucket` field.
    ctx = be.Context(gs=None,
                     model=SentenceTransformer("all-MiniLM-L6-v2"),
                     bucket="",
                     tmp="/tmp")

    # Smilarly, sheets_url and worksheet_name can be empty strings.
    sheets_url = ""
    worksheet_name = ""

    # Filepaths all correspond to the testdata folder.
    input_dir = "testdata/input"
    input_other_alternatives_filepath = os.path.join(input_dir,
                                                     "other_alternatives.csv")
    input_palm_alternatives_filepath = os.path.join(input_dir,
                                                    "palm_alternatives.csv")

    with tempfile.TemporaryDirectory() as tmp_dir, self.assertRaises(KeyError):
      tmp_local_sheets_csv_filepath = os.path.join(tmp_dir, "sheets_data.csv")
      tmp_local_merged_filepath = os.path.join(tmp_dir, "merged_data.csv")
      be.build(
          ctx, sheets_url, worksheet_name, tmp_local_sheets_csv_filepath,
          tmp_local_merged_filepath,
          [input_other_alternatives_filepath, input_palm_alternatives_filepath])

  def testSuccess(self):

    # Mock the get_sheets_data function to return test data.
    be.get_sheets_data = mock.Mock(return_value=get_test_sv_data())

    # Given that the get_sheets_data() function is mocked, the Context
    # object does not need a valid `gs` and `bucket` field.
    ctx = be.Context(gs=None,
                     model=SentenceTransformer("all-MiniLM-L6-v2"),
                     bucket="",
                     tmp="/tmp")

    # Smilarly, sheets_url and worksheet_name can be empty strings.
    sheets_url = ""
    worksheet_name = ""

    # Filepaths all correspond to the testdata folder.
    input_dir = "testdata/input"
    expected_dir = "testdata/expected"
    input_other_alternatives_filepath = os.path.join(input_dir,
                                                     "other_alternatives.csv")
    input_palm_alternatives_filepath = os.path.join(input_dir,
                                                    "palm_alternatives.csv")
    expected_local_sheets_csv_filepath = os.path.join(expected_dir,
                                                      "sheets_data.csv")
    expected_local_merged_filepath = os.path.join(expected_dir,
                                                  "merged_data.csv")
    expected_dcid_sentence_csv_filepath = os.path.join(
        expected_dir, "final_dcid_sentences_csv.csv")

    with tempfile.TemporaryDirectory() as tmp_dir:
      tmp_local_sheets_csv_filepath = os.path.join(tmp_dir, "sheets_data.csv")
      tmp_local_merged_filepath = os.path.join(tmp_dir, "merged_data.csv")
      tmp_dcid_sentence_csv = os.path.join(tmp_dir,
                                           "final_dcid_sentences_csv.csv")

      embeddings_df = be.build(
          ctx, sheets_url, worksheet_name, tmp_local_sheets_csv_filepath,
          tmp_local_merged_filepath,
          [input_other_alternatives_filepath, input_palm_alternatives_filepath])

      # Write dcids, sentences to temp directory.
      embeddings_df[['dcid', 'sentence']].to_csv(tmp_dcid_sentence_csv)

      # Compare the output files.
      _compare_files(self, tmp_local_sheets_csv_filepath,
                     expected_local_sheets_csv_filepath)
      _compare_files(self, tmp_local_merged_filepath,
                     expected_local_merged_filepath)
      _compare_files(self, tmp_dcid_sentence_csv,
                     expected_dcid_sentence_csv_filepath)


class TestEndToEndActualDataFiles(unittest.TestCase):

  def testInputFilesValidations(self):
    # Verify that the required files exist.
    sheets_filepath = os.path.join("sheets", "dc_nl_svs_curated.csv")
    input_other_alternatives_filepath = os.path.join("csv",
                                                     "other_alternatives.csv")
    input_palm_alternatives_filepath = os.path.join("csv",
                                                    "palm_alternatives.csv")
    output_dcid_sentences_filepath = os.path.join(
        "csv", "embeddings_input_sv_descriptions.csv")

    # Check that all the files exist.
    self.assertTrue(os.path.exists(sheets_filepath))
    self.assertTrue(os.path.exists(input_other_alternatives_filepath))
    self.assertTrue(os.path.exists(input_palm_alternatives_filepath))
    self.assertTrue(os.path.exists(output_dcid_sentences_filepath))

    # Perform input file validations.

    # The input data files should not have the same sentence/description map to
    # different SV dcids.
    sheets_df = pd.read_csv(sheets_filepath).fillna("")
    expected_cols = [
        "dcid", "Name", "Description", "Override_Alternatives",
        "Curated_Alternatives"
    ]
    sheets_sentence_cols = expected_cols[1:]

    self.assertCountEqual(expected_cols, sheets_df.columns.values)
    _validate_sentence_to_dcid_map(self, sheets_df, "dcid",
                                   sheets_sentence_cols)

    palm_alts_df = pd.read_csv(input_palm_alternatives_filepath).fillna("")
    other_alts_df = pd.read_csv(input_other_alternatives_filepath).fillna("")
    expected_cols = ["dcid", "Alternatives"]
    alt_sentence_cols = expected_cols[1:]

    self.assertCountEqual(expected_cols, palm_alts_df.columns.values)
    self.assertCountEqual(expected_cols, other_alts_df.columns.values)
    _validate_sentence_to_dcid_map(self, palm_alts_df, "dcid",
                                   alt_sentence_cols)
    _validate_sentence_to_dcid_map(self, other_alts_df, "dcid",
                                   alt_sentence_cols)

  def testOutputFileValidations(self):
    output_dcid_sentences_filepath = os.path.join(
        "csv", "embeddings_input_sv_descriptions.csv")

    dcid_sentence_df = pd.read_csv(output_dcid_sentences_filepath).fillna("")

    # Check that the dcids do not have duplicate rows.
    self.assertEqual(len(dcid_sentence_df),
                     len(dcid_sentence_df["dcid"].unique()))
    self.assertEqual(len(dcid_sentence_df),
                     len(dcid_sentence_df["sentence"].unique()))

    # Check that there are no duplicate sentences.
    sentences = {}
    for row_index, row in dcid_sentence_df.iterrows():
      sv_dcid = row["dcid"]
      for s in row["sentence"].split(";"):
        if not s:
          continue

        existing_sv_index = sentences.get(s, ())
        err_msg = f"\nSentence already exists: {s}.\nCurrent (SV, index): {sv_dcid, row_index}.\nExisting (SV, index): {existing_sv_index}."
        self.assertFalse(s in sentences, err_msg)
        sentences[s] = (sv_dcid, row_index)

  def testEmbeddingsValidations(self):
    # TODO: consider moving this test to a separate file which is
    # tiggered on demand. This test can take a while to run (esp when the
    # number of SVs and sentences becomes larger in the future.
    sheets_filepath = os.path.join("sheets", "dc_nl_svs_curated.csv")
    input_other_alternatives_filepath = os.path.join("csv",
                                                     "other_alternatives.csv")
    input_palm_alternatives_filepath = os.path.join("csv",
                                                    "palm_alternatives.csv")
    output_dcid_sentences_filepath = os.path.join(
        "csv", "embeddings_input_sv_descriptions.csv")

    # Mock the get_sheets_data function to return data from sheets_filepath.
    be.get_sheets_data = mock.Mock(
        return_value=pd.read_csv(sheets_filepath).fillna(""))

    # Given that the get_sheets_data() function is mocked, the Context
    # object does not need a valid `gs` and `bucket` field.
    ctx = be.Context(gs=None,
                     model=SentenceTransformer("all-MiniLM-L6-v2"),
                     bucket="",
                     tmp="/tmp")

    # Smilarly, sheets_url and worksheet_name can be empty strings.
    sheets_url = ""
    worksheet_name = ""

    # Intermediate outputs can be written to a temporary directory.
    with tempfile.TemporaryDirectory() as tmp_dir:
      tmp_local_sheets_csv_filepath = os.path.join(tmp_dir, "sheets_data.csv")
      tmp_local_merged_filepath = os.path.join(tmp_dir, "merged_data.csv")

      embeddings_df = be.build(
          ctx, sheets_url, worksheet_name, tmp_local_sheets_csv_filepath,
          tmp_local_merged_filepath,
          [input_other_alternatives_filepath, input_palm_alternatives_filepath])

      # Verify that embeddings were created for all DCIDs and Sentences.
      dcid_sentence_df = pd.read_csv(output_dcid_sentences_filepath).fillna("")
      sentences = set()
      for alts in dcid_sentence_df["sentence"].values:
        for s in alts.split(";"):
          if not s:
            continue
          sentences.add(s)

      self.assertEqual(len(sentences), len(embeddings_df))

      # Verify that the number of columns = length of the embeddings vector + one each for the
      # dcid and sentence columns.
      self.assertEqual(len(embeddings_df.columns), 384 + 2)
