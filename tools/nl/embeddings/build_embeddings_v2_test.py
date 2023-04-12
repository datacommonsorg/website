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
import unittest
from unittest import mock

import build_embeddings_v2 as be
import pandas as pd
from sentence_transformers import SentenceTransformer


def get_test_sv_data():
  dcids = ["SV_1", "SV_2", "SV_3", "SV_4"]
  names = ["name1", "name2", "name3", "name4"]
  decriptions = ["desc1", "desc2", "desc3", "desc4"]
  overrides = ["", "", "override3", ""]
  curated = ["abc1;xyz1", "abc2;xyz2;abc2", "abc3;xyz3", "abc4;xyz4"]

  return pd.DataFrame.from_dict({
      "dcid": dcids,
      "Name": names,
      "Description": decriptions,
      "Override_Alternatives": overrides,
      "Curated_Alternatives": curated,
  })


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
    local_sheets_csv_filepath = "testdata/output/sheets_data.csv"
    local_merged_filepath = "testdata/output/merged_data.csv"
    other_alternatives_filepath = "testdata/input/other_alternatives.csv"
    palm_alternatives_filepath = "testdata/input/palm_alternatives.csv"

    with self.assertRaises(KeyError):
      be.build(ctx, sheets_url, worksheet_name, local_sheets_csv_filepath,
               local_merged_filepath,
               [other_alternatives_filepath, palm_alternatives_filepath])

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
    local_sheets_csv_filepath = "testdata/output/sheets_data.csv"
    local_merged_filepath = "testdata/output/merged_data.csv"
    other_alternatives_filepath = "testdata/input/other_alternatives.csv"
    palm_alternatives_filepath = "testdata/input/palm_alternatives.csv"

    embeddings_df = be.build(
        ctx, sheets_url, worksheet_name, local_sheets_csv_filepath,
        local_merged_filepath,
        [other_alternatives_filepath, palm_alternatives_filepath])

    # Verify that the output directory has the expected files.
    self.assertTrue(os.path.exists(os.path.join(local_sheets_csv_filepath)))
    self.assertTrue(os.path.exists(os.path.join(local_merged_filepath)))

    # Verify that embeddings_df has 386 columns (embedding vector (384), dcid, sentence)
    self.assertEqual(len(embeddings_df.columns), 386)

    # Verify that dcid and sentence are in the columns.
    self.assertTrue('dcid' in embeddings_df.columns)
    self.assertTrue('sentence' in embeddings_df.columns)

    # Verify that there are 4 StatVars and check them all.
    self.assertEqual(len(embeddings_df['dcid'].unique()), 4)

    # Verify the number of sentence alternatives.
    # The total should be 20. Details:
    #   1 override (override for SV_3 means that for SV_3 the only alternate comes from the override)
    #   3 names (4 without override)
    #   3 descriptions (4 without override)
    #   6 curated alternatives (SV_2 has a duplicate which should be ignored; 8 without override)
    #   5 other alternatives (8 without override)
    #   2 palm alternatives (5 without override)
    sentences = embeddings_df['sentence'].to_list()
    self.assertEqual(len(embeddings_df), 20)
    self.assertEqual(len(sentences), 20)

    # Check that each sentence (alternative) exists without any spaces at the start and at the end.
    for sent in sentences:
      self.assertEqual(sent, sent.strip())

    # Check that a couple of the alternatives exist.
    self.assertTrue('abc1' in sentences)  # from get_test_sv_data().
    self.assertTrue('SV1 palm text sentence'
                    in sentences)  # from testdata/input/palm_alternatives.csv
    self.assertTrue('even more text for SV2'
                    in sentences)  # from testdata/input/other_alternatives.csv
