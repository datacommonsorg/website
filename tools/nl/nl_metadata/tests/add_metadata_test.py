# Copyright 2025 Google LLC
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

import asyncio
import unittest
from unittest.mock import Mock
from unittest.mock import patch

from tools.nl.nl_metadata import add_metadata
from tools.nl.nl_metadata.tests import mock_data


class TestAddMetadata(unittest.TestCase):
  """Tests for add_metadata.py."""

  @patch('argparse.ArgumentParser.parse_args')
  def test_extract_flag(self, mock_parse_args):
    """Tests that flags are extracted correctly."""
    mock_parse_args.return_value = add_metadata.argparse.Namespace(
        **mock_data.MOCK_ARGS)
    args = add_metadata.extract_flag()
    self.assertTrue(args.generateAltSentences)
    self.assertEqual(args.geminiApiKey, 'test_key')
    self.assertEqual(args.language, 'French')
    self.assertTrue(args.useGCS)
    self.assertTrue(args.useBigQuery)
    self.assertEqual(args.maxStatVars, 100)
    self.assertEqual(args.gcsFolder, 'test_folder')
    self.assertEqual(args.totalPartitions, 2)
    self.assertEqual(args.currPartition, 1)
    self.assertEqual(args.failedAttemptsPath, 'test/path')

  def test_verify_args_valid(self):
    """Tests that valid arguments are accepted."""
    args = add_metadata.argparse.Namespace(totalPartitions=1,
                                           currPartition=0,
                                           maxStatVars=100,
                                           failedAttemptsPath=None)
    try:
      add_metadata.verify_args(args)
    except ValueError:
      self.fail("verify_args() raised ValueError unexpectedly!")

  def test_verify_args_invalid_partitions(self):
    """Tests that an invalid totalPartitions value raises an error."""
    args = add_metadata.argparse.Namespace(totalPartitions=0,
                                           currPartition=0,
                                           maxStatVars=100,
                                           failedAttemptsPath=None)
    with self.assertRaises(ValueError):
      add_metadata.verify_args(args)

  def test_verify_args_invalid_partition_equal(self):
    """Tests that currPartition == totalPartitions raises an error."""
    args = add_metadata.argparse.Namespace(totalPartitions=2,
                                           currPartition=2,
                                           maxStatVars=100,
                                           failedAttemptsPath=None)
    with self.assertRaises(ValueError):
      add_metadata.verify_args(args)

  @patch('tools.nl.nl_metadata.add_metadata.verify_gcs_path_exists',
         return_value=False)
  def test_verify_args_gcs_path_does_not_exist(self, mock_verify_gcs):
    """Tests that a non-existent GCS path raises an error."""
    args = add_metadata.argparse.Namespace(totalPartitions=1,
                                           currPartition=0,
                                           maxStatVars=100,
                                           failedAttemptsPath='test/path.json',
                                           useGCS=True)
    with self.assertRaises(ValueError):
      add_metadata.verify_args(args)
    mock_verify_gcs.assert_called_once_with('test/path.json')

  @patch('os.path.exists', return_value=False)
  def test_verify_args_local_path_does_not_exist(self, mock_exists):
    """Tests that a non-existent local path raises an error."""
    args = add_metadata.argparse.Namespace(totalPartitions=1,
                                           currPartition=0,
                                           maxStatVars=100,
                                           failedAttemptsPath='test/path.json',
                                           useGCS=False)
    with self.assertRaises(ValueError):
      add_metadata.verify_args(args)
    mock_exists.assert_called_once_with('test/path.json')

  def test_get_bq_query(self):
    """Tests the construction of the BigQuery query."""
    query = add_metadata.get_bq_query(2, 1, 100)
    self.assertIn("LIMIT 100", query)
    self.assertIn("MOD(ABS(FARM_FINGERPRINT(id)), 2) = 1", query)

  def test_split_into_batches(self):
    """Tests splitting a list into batches."""
    data = list(range(10))
    batches = add_metadata.split_into_batches(data, 3)
    self.assertEqual(len(batches), 4)
    self.assertEqual(len(batches[0]), 3)
    self.assertEqual(len(batches[3]), 1)

  @patch('google.cloud.storage.Client')
  def test_read_sv_metadata_failed_attempts_gcs(self, mock_gcs_client):
    """Tests reading failed attempts from a GCS path."""
    mock_bucket = Mock()
    mock_blob = Mock()
    mock_blob.name = "test_file.json"
    mock_blob.download_as_text.return_value = mock_data.FAILED_ATTEMPTS_GCS
    mock_gcs_client.return_value.bucket.return_value = mock_bucket
    mock_bucket.list_blobs.return_value = [mock_blob]
    result = add_metadata.read_sv_metadata_failed_attempts("test_folder/", True)
    self.assertEqual(len(result), 1)
    self.assertEqual(len(result[0]), 2)
    self.assertEqual(result[0][0]['dcid'], 'dcid1')

  @patch('os.path.isdir', return_value=True)
  @patch('os.listdir', return_value=['test.json'])
  @patch('builtins.open',
         new_callable=unittest.mock.mock_open,
         read_data=mock_data.FAILED_ATTEMPTS_LOCAL)
  def test_read_sv_metadata_failed_attempts_local_folder(
      self, mock_open, mock_listdir, mock_isdir):
    """Tests reading failed attempts from a local folder."""
    result = add_metadata.read_sv_metadata_failed_attempts(
        "test_folder/", False)
    self.assertEqual(len(result), 1)
    self.assertEqual(len(result[0]), 1)
    self.assertEqual(result[0][0]['dcid'], 'dcid1')
    mock_open.assert_called_once_with("test_folder/test.json", "r")

  @patch('os.path.isdir', return_value=False)
  @patch('builtins.open',
         new_callable=unittest.mock.mock_open,
         read_data=mock_data.FAILED_ATTEMPTS_LOCAL)
  def test_read_sv_metadata_failed_attempts_local_file(self, mock_open,
                                                       mock_isdir):
    """Tests reading failed attempts from a single local file."""
    result = add_metadata.read_sv_metadata_failed_attempts(
        "test_file.json", False)
    self.assertEqual(len(result), 1)
    self.assertEqual(len(result[0]), 1)
    self.assertEqual(result[0][0]['dcid'], 'dcid1')
    mock_open.assert_called_once_with("test_file.json", "r")

  @patch('google.cloud.bigquery.Client')
  def test_create_sv_metadata_bigquery(self, mock_bq_client):
    """Tests the creation of SV metadata from BigQuery."""
    mock_query_job = Mock()
    mock_results = Mock()
    mock_results.pages = "test_pages"
    mock_query_job.result.return_value = mock_results
    mock_bq_client.return_value.query.return_value = mock_query_job

    pages = add_metadata.create_sv_metadata_bigquery(2, 1, 100)

    self.assertEqual(pages, "test_pages")
    expected_query = add_metadata.get_bq_query(2, 1, 100)
    mock_bq_client.return_value.query.assert_called_once_with(expected_query)
    mock_query_job.result.assert_called_once_with(
        page_size=add_metadata.PAGE_SIZE)

  @patch('pandas.read_csv')
  def test_create_sv_metadata_nl(self, mock_read_csv):
    """Tests the creation of SV metadata from the NL CSV."""
    import pandas as pd
    mock_read_csv.return_value = pd.DataFrame(mock_data.NL_CSV_DATA)
    result = add_metadata.create_sv_metadata_nl()
    self.assertEqual(len(result), 1)
    self.assertEqual(len(result[0]), 2)
    self.assertEqual(result[0]['dcid1'], 'sentence1')

  def test_get_language_settings(self):
    """Tests the language settings logic."""
    # Test English
    exported_file, _ = add_metadata.get_language_settings("English")
    self.assertEqual(exported_file, "sv_complete_metadata_English")

    # Test French
    exported_file, _ = add_metadata.get_language_settings("French")
    self.assertEqual(exported_file, "sv_complete_metadata_French")

    # Test Spanish
    exported_file, _ = add_metadata.get_language_settings("Spanish")
    self.assertEqual(exported_file, "sv_complete_metadata_Spanish")

  def test_get_prop_value(self):
    """Tests the extraction of property values from DC API responses."""
    self.assertEqual(add_metadata.get_prop_value(mock_data.PROP_DATA_VALUE),
                     "test_value")
    self.assertEqual(add_metadata.get_prop_value(mock_data.PROP_DATA_NAME),
                     "test_name")
    self.assertEqual(add_metadata.get_prop_value(mock_data.PROP_DATA_DCID),
                     "test_dcid")

  def test_flatten_dc_api_response(self):
    """Tests the flattening of the DC API response."""
    result = add_metadata.flatten_dc_api_response(mock_data.DC_API_METADATA,
                                                  mock_data.DCID_TO_SENTENCE)
    self.assertEqual(len(result), 1)
    self.assertEqual(result[0]['dcid'], 'dcid1')
    self.assertEqual(result[0]['name'], 'Test Name')
    self.assertEqual(result[0]['constraintProperties'], ['Property 1: value1'])

  @patch('tools.nl.nl_metadata.add_metadata.DataCommonsClient')
  def test_extract_metadata_dc_api(self, mock_dc_client):
    """Tests metadata extraction from the DC API."""
    mock_dc_client.return_value.node.fetch.return_value.to_dict.return_value.get.return_value = mock_data.DC_API_METADATA
    result = add_metadata.extract_metadata([mock_data.DCID_TO_SENTENCE],
                                           use_bigquery=False)
    self.assertEqual(len(result), 1)
    self.assertEqual(result[0]['dcid'], 'dcid1')
    self.assertEqual(result[0]['name'], 'Test Name')
    mock_dc_client.return_value.node.fetch.assert_called_once_with(
        node_dcids=['dcid1'], expression='->*')

  @patch('tools.nl.nl_metadata.add_metadata.DataCommonsClient')
  def test_extract_metadata_dc_api_no_data(self, mock_dc_client):
    """Tests that an error is raised when the DC API returns no data."""
    mock_dc_client.return_value.node.fetch.return_value.to_dict.return_value.get.return_value = {}
    with self.assertRaises(ValueError):
      add_metadata.extract_metadata([mock_data.DCID_TO_SENTENCE],
                                    use_bigquery=False)

  def test_extract_metadata_bigquery(self):
    """Tests metadata extraction from a BigQuery row."""

    class MockRow:

      def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.name = kwargs.get('name')
        self.measured_prop = kwargs.get('measured_prop')
        self.population_type = kwargs.get('population_type')
        self.stat_type = kwargs.get('stat_type')
        self.__dict__.update(kwargs)

      def __getattr__(self, name):
        return self.__dict__.get(name)

    mock_row = MockRow(**mock_data.BIGQUERY_MOCK_ROW_KWARGS)
    batched_metadata_page = [mock_row]
    result = add_metadata.extract_metadata(batched_metadata_page,
                                           use_bigquery=True)
    self.assertEqual(len(result), 1)
    self.assertEqual(result[0]['dcid'], 'dcid1')
    self.assertEqual(result[0]['name'], 'Test Name')
    self.assertEqual(result[0]['constraintProperties'], ['prop1: val1'])

  def test_extract_constraint_properties_bigquery(self):
    """Tests extraction of constraint properties from a BigQuery row."""

    class MockRow:

      def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

      def __getattr__(self, name):
        return self.__dict__.get(name)

    mock_row = MockRow(**mock_data.BIGQUERY_ROW_DATA)
    result = add_metadata.extract_constraint_properties_bigquery(mock_row)
    self.assertEqual(result, ['prop1: val1', 'prop2: val2', 'prop4: val4'])

  def test_extract_constraint_properties_dc_api(self):
    """Tests extraction of constraint properties from a DC API response."""
    props = add_metadata.extract_constraint_properties_dc_api(
        mock_data.STATVAR_DATA_DC_API)
    self.assertEqual(props, ["Property 1: value1"])

  @patch('google.genai.Client')
  def test_batch_generate_alt_sentences(self, mock_gemini_client):
    """Tests the successful generation of alternative sentences."""

    class MockParsed:

      def __init__(self, data):
        self._data = data

      def model_dump(self):
        return self._data

    mock_response = Mock()
    mock_response.parsed = [MockParsed(mock_data.GEMINI_SUCCESS_RESPONSE)]
    mock_gemini_client.return_value.aio.models.generate_content = unittest.mock.AsyncMock(
        return_value=mock_response)
    results, failed = asyncio.run(
        add_metadata.batch_generate_alt_sentences(
            mock_data.SV_METADATA_LIST_EMPTY_SENTENCES, 'fake_key',
            'fake_prompt'))
    self.assertEqual(len(results), 1)
    self.assertEqual(len(failed), 0)
    self.assertEqual(results[0]['dcid'], 'dcid1')
    self.assertEqual(len(results[0]['generatedSentences']), 2)
    mock_gemini_client.return_value.aio.models.generate_content.assert_called_once(
    )

  @patch('google.genai.Client')
  def test_batch_generate_alt_sentences_failure(self, mock_gemini_client):
    """Tests the failure case for generating alternative sentences."""
    mock_response = Mock()
    mock_response.parsed = None
    mock_gemini_client.return_value.aio.models.generate_content = unittest.mock.AsyncMock(
        return_value=mock_response)
    results, failed = asyncio.run(
        add_metadata.batch_generate_alt_sentences(
            mock_data.SV_METADATA_LIST_EMPTY_SENTENCES, 'fake_key',
            'fake_prompt'))
    self.assertEqual(len(results), 0)
    self.assertEqual(len(failed), 1)
    self.assertEqual(failed[0]['dcid'], 'dcid1')
    self.assertIsNone(failed[0]['generatedSentences'])
    self.assertEqual(
        mock_gemini_client.return_value.aio.models.generate_content.call_count,
        add_metadata.MAX_RETRIES)

  def test_get_gcs_folder(self):
    """Tests the GCS folder logic."""
    # Test with specified gcs_folder
    folder = add_metadata.get_gcs_folder("my_folder", None, False)
    self.assertIn("my_folder", folder)

    # Test with failed_attempts_path
    folder = add_metadata.get_gcs_folder(None, "retries/path", False)
    self.assertIn(add_metadata.GCS_FILE_DIR_RETRIES, folder)

    # Test with use_bigquery
    folder = add_metadata.get_gcs_folder(None, None, True)
    self.assertIn(add_metadata.GCS_FILE_DIR_FULL, folder)

    # Test default NL case
    folder = add_metadata.get_gcs_folder(None, None, False)
    self.assertIn(add_metadata.GCS_FILE_DIR_NL, folder)

  @patch('google.cloud.storage.Client')
  @patch('builtins.open', new_callable=unittest.mock.mock_open)
  @patch('os.makedirs')
  def test_export_to_json_local(self, mock_makedirs, mock_open,
                                mock_gcs_client):
    """Tests exporting data to a local JSON file."""
    add_metadata.export_to_json(mock_data.SV_METADATA_LIST_MINIMAL,
                                "test_file",
                                False,
                                gcs_folder=None)
    mock_makedirs.assert_called_once_with("tools/nl/nl_metadata/failures",
                                          exist_ok=True)
    mock_open.assert_called_once_with("tools/nl/nl_metadata/test_file.json",
                                      "w")
    mock_open().write.assert_called_once()

  @patch('google.cloud.storage.Client')
  def test_export_to_json_gcs(self, mock_gcs_client):
    """Tests exporting data to a GCS JSON file."""
    mock_bucket = Mock()
    mock_blob = Mock()
    mock_gcs_client.return_value.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob
    add_metadata.export_to_json(mock_data.SV_METADATA_LIST_MINIMAL, "test_file",
                                True, "test_folder")
    mock_gcs_client.return_value.bucket.assert_called_once_with(
        add_metadata.GCS_BUCKET)
    mock_bucket.blob.assert_called_once_with("test_folder/test_file.json")
    mock_blob.upload_from_string.assert_called_once()
