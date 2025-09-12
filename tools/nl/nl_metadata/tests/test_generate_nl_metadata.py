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
  @patch(
      'tools.nl.nl_metadata.generate_nl_metadata.batch_generate_alt_sentences',
      new_callable=AsyncMock)
  @patch(
      'tools.nl.nl_metadata.generate_nl_metadata.data_loader.create_sv_metadata_bigquery')
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
    success_filename_part = "sv_complete_metadata_English_1_1.json"
    self.assertIn(success_filename_part, "".join(uploads.keys()))
    success_key = next((k for k in uploads if success_filename_part in k), None)
    self.assertIsNotNone(success_key)
    self.assertIn(mock_data.GEMINI_SUCCESS_RESULT['dcid'], uploads[success_key])

    # Verify the failed results were saved correctly
    failure_filename_part = "failures/failed_batch_1_1.json"
    self.assertIn(failure_filename_part, "".join(uploads.keys()))
    failure_key = next((k for k in uploads if failure_filename_part in k), None)
    self.assertIsNotNone(failure_key)
    self.assertIn(mock_data.GEMINI_FAILURE_RESULT['dcid'], uploads[failure_key])

  @patch('argparse.ArgumentParser.parse_args')
  @patch('google.cloud.storage.Client')
  @patch(
      'tools.nl.nl_metadata.generate_nl_metadata.batch_generate_alt_sentences',
      new_callable=AsyncMock)
  @patch(
      'tools.nl.nl_metadata.generate_nl_metadata.data_loader.read_sv_metadata_failed_attempts'
  )
  @patch('tools.nl.nl_metadata.generate_nl_metadata.data_loader.extract_metadata')
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

    # Verify the successful results were saved correctly to the specified gcsFolder
    # The key in the uploads dict is the full GCS path: <gcs_folder>/<filename>.json
    self.assertEqual(len(uploads), 1)
    upload_path = list(uploads.keys())[0]

    # Check that the output is in the correct folder
    self.assertTrue(upload_path.startswith('my-periodic-folder/'))

    # Check that the filename matches the new "diff_retry_" format
    upload_filename = upload_path.split('/')[-1]
    self.assertTrue(upload_filename.startswith('diff_retry_'))
    self.assertTrue(upload_filename.endswith('_1.json'))

    # Check the content of the uploaded file
    upload_content = list(uploads.values())[0]
    self.assertIn(mock_data.GEMINI_RETRY_SUCCESS_RESULT['dcid'], upload_content)
    self.assertIn('alt sentence 3', upload_content)

  @patch('argparse.ArgumentParser.parse_args')
  @patch('google.cloud.storage.Client')
  @patch('os.remove')
  def test_compact_mode(self, mock_os_remove, mock_gcs_client, mock_parse_args):
    """
    Tests the compact run mode.
    - Mocks GCS to return a list of files, including some in subdirectories.
    - Verifies that only the root files are merged.
    - Verifies that a new compacted file is uploaded.
    - Verifies that original files are NOT deleted.
    """
    # Mock the command-line arguments
    # Note: the mock data uses a fixed output filename for predictable assertions
    mock_parse_args.return_value = generate_nl_metadata.argparse.Namespace(
        **mock_data.MOCK_COMPACT_ARGS)

    # Mock the GCS client and blobs
    mock_bucket = MagicMock()
    mock_gcs_client.return_value.bucket.return_value = mock_bucket

    # Create mock blobs
    blob1 = MagicMock()
    blob1.name = 'my-periodic-folder/file1.jsonl'

    blob2 = MagicMock()
    blob2.name = 'my-periodic-folder/file2.jsonl'

    # This blob should be ignored because it's in a subdirectory
    # The delimiter='/' call means list_blobs won't even return it, but we mock the whole return list for clarity.
    blob_sub = MagicMock()
    blob_sub.name = 'my-periodic-folder/sub/file3.jsonl'

    # The list_blobs iterator should yield only the root files
    mock_bucket.list_blobs.return_value = [blob1, blob2]

    # Mock the upload blob
    mock_upload_blob = MagicMock()

    # Have bucket.blob return the mock_upload_blob when called for the output file
    mock_bucket.blob.return_value = mock_upload_blob

    # Run the main script
    asyncio.run(generate_nl_metadata.main())

    # Assertions
    # Verify that list_blobs was called correctly to filter for the root folder
    mock_bucket.list_blobs.assert_called_once_with(
        prefix='my-periodic-folder/', delimiter='/')

    # Verify that the correct files were downloaded
    self.assertEqual(blob1.download_to_file.call_count, 1)
    self.assertEqual(blob2.download_to_file.call_count, 1)

    # Verify that the new compacted file was uploaded
    mock_bucket.blob.assert_called_with('my-periodic-folder/compacted_test.jsonl')
    mock_upload_blob.upload_from_filename.assert_called_once()

    # Verify the temp file was removed
    mock_os_remove.assert_called_once()

    # Verify that original files were NOT deleted
    self.assertEqual(blob1.delete.call_count, 0)
    self.assertEqual(blob2.delete.call_count, 0)

  @patch('argparse.ArgumentParser.parse_args')
  @patch('google.cloud.storage.Client')
  @patch('os.remove')
  def test_compact_mode_with_delete(self, mock_os_remove, mock_gcs_client,
                                  mock_parse_args):
    """
    Tests the compact run mode with the --delete_originals flag.
    - Verifies that the original root files are deleted after compaction.
    """
    # Mock the command-line arguments
    mock_parse_args.return_value = generate_nl_metadata.argparse.Namespace(
        **mock_data.MOCK_COMPACT_ARGS_WITH_DELETE)

    # Mock the GCS client and blobs
    mock_bucket = MagicMock()
    mock_gcs_client.return_value.bucket.return_value = mock_bucket

    # Create mock blobs
    blob1 = MagicMock()
    blob1.name = 'my-periodic-folder/file1.jsonl'

    blob2 = MagicMock()
    blob2.name = 'my-periodic-folder/file2.jsonl'

    mock_bucket.list_blobs.return_value = [blob1, blob2]

    mock_upload_blob = MagicMock()
    mock_bucket.blob.return_value = mock_upload_blob

    # Run the main script
    asyncio.run(generate_nl_metadata.main())

    # Assertions
    mock_bucket.list_blobs.assert_called_once_with(
        prefix='my-periodic-folder/', delimiter='/')
    mock_upload_blob.upload_from_filename.assert_called_once()

    # Verify that original files WERE deleted
    self.assertEqual(blob1.delete.call_count, 1)
    self.assertEqual(blob2.delete.call_count, 1)

  @patch('argparse.ArgumentParser.parse_args')
  @patch('google.cloud.storage.Client')
  @patch('google.cloud.bigquery.Client')
  @patch('tools.nl.nl_metadata.generate_nl_metadata.data_loader.read_gcs_jsonl_ids')
  @patch(
      'tools.nl.nl_metadata.generate_nl_metadata.batch_generate_alt_sentences',
      new_callable=AsyncMock)
  def test_bigquery_diffs_mode(self, mock_batch_generate, mock_read_gcs_ids,
                             mock_bq_client, mock_gcs_client, mock_parse_args):
    """
    Tests the bigquery_diffs run mode.
    - Mocks GCS to have an existing set of DCIDs.
    - Mocks BigQuery to have a different, overlapping set of DCIDs.
    - Verifies that the script correctly identifies and processes only the new DCIDs.
    - Verifies that a new 'diff' file is created with the correct content.
    """
    # Mock args
    mock_parse_args.return_value = generate_nl_metadata.argparse.Namespace(
        **mock_data.MOCK_DIFFS_ARGS)

    # Mock the inputs
    mock_read_gcs_ids.return_value = {'dcid1', 'dcid2'}

    # Mock BQ client
    mock_bq_instance = mock_bq_client.return_value

    # First query gets all IDs from the BQ partition

    class MockIdRow:

      def __init__(self, id):
        self.id = id

    all_ids_query_job = MagicMock()
    all_ids_query_job.result.return_value = [MockIdRow('dcid1'), MockIdRow('dcid3')]

    class MockDataRow:

      def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.name = kwargs.get('name')
        self.measured_prop = kwargs.get('measured_prop')
        self.population_type = kwargs.get('population_type')
        self.stat_type = kwargs.get('stat_type')
        self.__dict__.update(kwargs)

      def __getattr__(self, name):
        return self.__dict__.get(name)

    diff_data_query_job = MagicMock()
    diff_data_query_job.result.return_value.pages = iter([[
        MockDataRow(
            id='dcid3',
            name='Test Name 3',
            measured_prop='Count',
            population_type='Person',
            stat_type='measuredValue',
            p1='prop3',
            v1='val3')
    ]])

    # Set the side_effect to return different results based on the query content
    def query_side_effect(query_string):
      # The query for the diff data will contain the new dcid
      if 'dcid3' in query_string:
        return diff_data_query_job
      # The initial query to get all IDs will not
      else:
        return all_ids_query_job

    mock_bq_instance.query.side_effect = query_side_effect

    # Mock Gemini to successfully process the diff
    mock_batch_generate.return_value = ([mock_data.GEMINI_RETRY_SUCCESS_RESULT], [])

    # Mock GCS for upload
    mock_bucket = MagicMock()
    mock_gcs_client.return_value.bucket.return_value = mock_bucket
    uploads = {}
    mock_upload_blob = MagicMock()

    def mock_upload(data, content_type):
      blob_name = mock_upload_blob.name
      uploads[blob_name] = data

    mock_upload_blob.upload_from_string.side_effect = mock_upload

    def set_blob_name(name):
      mock_upload_blob.name = name
      return mock_upload_blob

    mock_bucket.blob.side_effect = set_blob_name

    # Run the main script
    asyncio.run(generate_nl_metadata.main())

    # Assertions
    mock_read_gcs_ids.assert_called_once_with('my-periodic-folder')
    self.assertEqual(mock_bq_instance.query.call_count, 2)
    mock_batch_generate.assert_called_once()

    # Assert that the upload happened and was correct
    self.assertEqual(len(uploads), 1)
    upload_path = list(uploads.keys())[0]
    self.assertTrue(upload_path.startswith('my-periodic-folder/diff_'))

    upload_content = list(uploads.values())[0]
    self.assertIn('dcid3', upload_content)
    self.assertNotIn('dcid1', upload_content)
    self.assertNotIn('dcid2', upload_content)
