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
    expected_embeddings_csv_filepath = os.path.join(expected_dir,
                                                    "embeddings_df_csv.csv")

    with tempfile.TemporaryDirectory() as tmp_dir:
      tmp_local_sheets_csv_filepath = os.path.join(tmp_dir, "sheets_data.csv")
      tmp_local_merged_filepath = os.path.join(tmp_dir, "merged_data.csv")
      tmp_embeddings_df_csv = os.path.join(tmp_dir, "embeddings_df_csv.csv")

      embeddings_df = be.build(
          ctx, sheets_url, worksheet_name, tmp_local_sheets_csv_filepath,
          tmp_local_merged_filepath,
          [input_other_alternatives_filepath, input_palm_alternatives_filepath])

      # Write embddings_df to temp directory.
      embeddings_df.to_csv(tmp_embeddings_df_csv)

      # Compare the output files.
      _compare_files(self, tmp_local_sheets_csv_filepath,
                     expected_local_sheets_csv_filepath)
      _compare_files(self, tmp_local_merged_filepath,
                     expected_local_merged_filepath)
      _compare_files(self, tmp_embeddings_df_csv,
                     expected_embeddings_csv_filepath)
