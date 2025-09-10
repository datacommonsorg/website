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
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

from tools.nl.nl_metadata import generate_nl_metadata
from tools.nl.nl_metadata.tests import mock_data


class TestAddMetadataE2E(unittest.TestCase):
  """End-to-end tests for generate_nl_metadata.py."""

  @patch('argparse.ArgumentParser.parse_args')
  @patch('google.cloud.storage.Client')
  @patch('tools.nl.nl_metadata.generate_nl_metadata.batch_generate_alt_sentences',
         new_callable=AsyncMock)
  @patch('tools.nl.nl_metadata.generate_nl_metadata.create_sv_metadata_bigquery')
  def test_bq_to_gcs(self, mock_create_sv, mock_batch_generate, mock_gcs_client,
                     mock_parse_args):
    """
        Tests the main script end-to-end, covering the following scenario:
        - Flags are set to use BigQuery, generate alt sentences, and save to GCS.
        - Data is fetched from a mocked BigQuery source.
        - Alternative sentence generation is mocked, with one batch succeeding and one failing.
        - Results are saved to a mocked GCS, and we verify that both successful and failed results are saved correctly.
        """

    # Mock the command-line arguments
    mock_parse_args.return_value = generate_nl_metadata.argparse.Namespace(
        **mock_data.MOCK_E2E_ARGS)

    # Mock the BigQuery data source
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

    mock_bq_rows = [
        MockRow(**mock_data.BIGQUERY_MOCK_ROW_KWARGS_1),
        MockRow(**mock_data.BIGQUERY_MOCK_ROW_KWARGS_2)
    ]
    mock_create_sv.return_value = iter([mock_bq_rows])

    # Mock the Gemini API call results
    mock_batch_generate.return_value = ([mock_data.GEMINI_SUCCESS_RESULT],
                                        [mock_data.GEMINI_FAILURE_RESULT])

    # Mock the GCS client and capture uploads
    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_gcs_client.return_value.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob
    uploads = {}

    def mock_upload(data, content_type):
      # The blob name is set by the call to mock_bucket.blob()
      blob_name = mock_blob.name
      uploads[blob_name] = data

    mock_blob.upload_from_string.side_effect = mock_upload

    def set_blob_name(name):
      mock_blob.name = name
      return mock_blob

    mock_bucket.blob.side_effect = set_blob_name

    # Run the main script
    asyncio.run(generate_nl_metadata.main())

    # Assertions
    mock_create_sv.assert_called_once_with(1, 0, None)
    mock_batch_generate.assert_called_once()
    self.assertEqual(mock_gcs_client.return_value.bucket.call_count, 2)

    # Verify the successful results were saved correctly
    success_filename_part = "sv_complete_metadata_English_1.json"
    self.assertIn(success_filename_part, "".join(uploads.keys()))
    success_key = next((k for k in uploads if success_filename_part in k), None)
    self.assertIsNotNone(success_key)
    self.assertIn(mock_data.GEMINI_SUCCESS_RESULT['dcid'], uploads[success_key])

    # Verify the failed results were saved correctly
    failure_filename_part = "failures/failed_batch_1.json"
    self.assertIn(failure_filename_part, "".join(uploads.keys()))
    failure_key = next((k for k in uploads if failure_filename_part in k), None)
    self.assertIsNotNone(failure_key)
    self.assertIn(mock_data.GEMINI_FAILURE_RESULT['dcid'], uploads[failure_key])

  @patch('argparse.ArgumentParser.parse_args')
  @patch('google.cloud.storage.Client')
  @patch('tools.nl.nl_metadata.generate_nl_metadata.batch_generate_alt_sentences',
         new_callable=AsyncMock)
  @patch('tools.nl.nl_metadata.generate_nl_metadata.read_sv_metadata_failed_attempts')
  @patch('tools.nl.nl_metadata.generate_nl_metadata.extract_metadata')
  @patch('tools.nl.nl_metadata.generate_nl_metadata.verify_gcs_path_exists')
  def test_failed_attempts_reingestion(self, mock_verify_gcs_path,
                                       mock_extract_metadata, mock_read_failed,
                                       mock_batch_generate, mock_gcs_client,
                                       mock_parse_args):
    """
        Tests the main script end-to-end for reprocessing failed attempts.
        - Flags are set to read from a failed attempts path and save to GCS.
        - The read function is mocked to return data for reprocessing.
        - Alternative sentence generation is mocked to succeed.
        - Results are saved to a mocked GCS, and we verify the output.
        """
    # Mock the gcs path check to return true
    mock_verify_gcs_path.return_value = True

    # Mock the command-line arguments
    mock_parse_args.return_value = generate_nl_metadata.argparse.Namespace(
        **mock_data.MOCK_FAILED_ATTEMPTS_E2E_ARGS)

    # Mock the data returned from reading the failed attempts file
    mock_read_failed.return_value = [mock_data.MOCK_FAILED_ATTEMPT_DATA]

    # Mock the Gemini API call to return a successful result
    mock_batch_generate.return_value = ([mock_data.GEMINI_RETRY_SUCCESS_RESULT],
                                        [])

    # Mock the GCS client and capture uploads
    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_gcs_client.return_value.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob
    uploads = {}

    def mock_upload(data, content_type):
      blob_name = mock_blob.name
      uploads[blob_name] = data

    mock_blob.upload_from_string.side_effect = mock_upload

    def set_blob_name(name):
      mock_blob.name = name
      return mock_blob

    mock_bucket.blob.side_effect = set_blob_name

    # Run the main script
    asyncio.run(generate_nl_metadata.main())

    # Assertions
    mock_read_failed.assert_called_once_with('gs://some/failed/path/', True)
    mock_extract_metadata.assert_not_called()
    mock_batch_generate.assert_called_once()

    # Should be called once for successful results, and not for the empty failed results
    self.assertEqual(mock_gcs_client.return_value.bucket.call_count, 1)

    # Verify the successful results were saved correctly
    success_filename_part = "sv_complete_metadata_English_1.json"
    self.assertIn(success_filename_part, "".join(uploads.keys()))
    success_key = next((k for k in uploads if success_filename_part in k), None)
    self.assertIsNotNone(success_key)
    self.assertIn(mock_data.GEMINI_RETRY_SUCCESS_RESULT['dcid'],
                  uploads[success_key])
    self.assertIn('alt sentence 3', uploads[success_key])
