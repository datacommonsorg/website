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


class TestAddMetadata(unittest.TestCase):

  @patch('argparse.ArgumentParser.parse_args')
  def test_extract_flag(self, mock_parse_args):
    mock_parse_args.return_value = add_metadata.argparse.Namespace(
        generateAltSentences=True,
        geminiApiKey='test_key',
        language='French',
        useGCS=True,
        useBigQuery=True,
        maxStatVars=100,
        gcsFolder='test_folder',
        totalPartitions=2,
        currPartition=1,
        failedAttemptsPath='test/path')
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
    args = add_metadata.argparse.Namespace(
        totalPartitions=1,
        currPartition=0,
        maxStatVars=100,
        failedAttemptsPath=None)
    try:
      add_metadata.verify_args(args)
    except ValueError:
      self.fail("verify_args() raised ValueError unexpectedly!")

  def test_verify_args_invalid_partitions(self):
    args = add_metadata.argparse.Namespace(
        totalPartitions=0,
        currPartition=0,
        maxStatVars=100,
        failedAttemptsPath=None)
    with self.assertRaises(ValueError):
      add_metadata.verify_args(args)

  def test_get_bq_query(self):
    query = add_metadata.get_bq_query(2, 1, 100)
    self.assertIn("LIMIT 100", query)
    self.assertIn("MOD(ABS(FARM_FINGERPRINT(id)), 2) = 1", query)

  def test_split_into_batches(self):
    data = list(range(10))
    batches = add_metadata.split_into_batches(data, 3)
    self.assertEqual(len(batches), 4)
    self.assertEqual(len(batches[0]), 3)
    self.assertEqual(len(batches[3]), 1)

  def test_get_prop_value(self):
    prop_data = {"nodes": [{"value": "test_value"}]}
    self.assertEqual(add_metadata.get_prop_value(prop_data), "test_value")
    prop_data = {"nodes": [{"name": "test_name"}]}
    self.assertEqual(add_metadata.get_prop_value(prop_data), "test_name")
    prop_data = {"nodes": [{"dcid": "test_dcid"}]}
    self.assertEqual(add_metadata.get_prop_value(prop_data), "test_dcid")

  def test_extract_constraint_properties_dc_api(self):
    statvar_data = {
        "constraintProperties": {
            "nodes": [{
                "dcid": "prop1",
                "name": "Property 1"
            }]
        },
        "prop1": {
            "nodes": [{
                "value": "value1"
            }]
        }
    }
    props = add_metadata.extract_constraint_properties_dc_api(statvar_data)
    self.assertEqual(props, ["Property 1: value1"])

  def test_flatten_dc_api_response(self):
    dc_api_metadata = {
        "dcid1": {
            "arcs": {
                "name": {
                    "nodes": [{
                        "value": "Test Name"
                    }]
                },
                "measuredProperty": {
                    "nodes": [{
                        "name": "Count"
                    }]
                },
                "populationType": {
                    "nodes": [{
                        "name": "Person"
                    }]
                },
                "statType": {
                    "nodes": [{
                        "name": "measuredValue"
                    }]
                },
                "constraintProperties": {
                    "nodes": [{
                        "dcid": "prop1",
                        "name": "Property 1"
                    }]
                },
                "prop1": {
                    "nodes": [{
                        "value": "value1"
                    }]
                }
            }
        }
    }
    dcid_to_sentence = {"dcid1": "Test sentence"}
    result = add_metadata.flatten_dc_api_response(dc_api_metadata,
                                                  dcid_to_sentence)
    self.assertEqual(len(result), 1)
    self.assertEqual(result[0]['dcid'], 'dcid1')
    self.assertEqual(result[0]['name'], 'Test Name')
    self.assertEqual(result[0]['constraintProperties'], ['Property 1: value1'])

  def test_extract_constraint_properties_bigquery(self):

    class MockRow:

      def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

      def __getattr__(self, name):
        return self.__dict__.get(name)

    row_data = {
        'p1': 'prop1',
        'v1': 'val1',
        'p2': 'prop2',
        'v2': 'val2',
        'p3': None,
        'v3': None,
        'p4': 'prop4',
        'v4': 'val4',
    }
    mock_row = MockRow(**row_data)
    result = add_metadata.extract_constraint_properties_bigquery(mock_row)
    self.assertEqual(result, ['prop1: val1', 'prop2: val2', 'prop4: val4'])

  @patch('tools.nl.nl_metadata.add_metadata.DataCommonsClient')
  def test_extract_metadata_dc_api(self, mock_dc_client):
    mock_response = {
        "dcid1": {
            "arcs": {
                "name": {
                    "nodes": [{
                        "value": "Test Name"
                    }]
                },
                "measuredProperty": {
                    "nodes": [{
                        "name": "Count"
                    }]
                },
                "populationType": {
                    "nodes": [{
                        "name": "Person"
                    }]
                },
                "statType": {
                    "nodes": [{
                        "name": "measuredValue"
                    }]
                },
            }
        }
    }
    mock_dc_client.return_value.node.fetch.return_value.to_dict.return_value.get.return_value = mock_response
    batched_metadata = [{"dcid1": "Test sentence"}]
    result = add_metadata.extract_metadata(batched_metadata, use_bigquery=False)
    self.assertEqual(len(result), 1)
    self.assertEqual(result[0]['dcid'], 'dcid1')
    self.assertEqual(result[0]['name'], 'Test Name')
    mock_dc_client.return_value.node.fetch.assert_called_once_with(
        node_dcids=['dcid1'], expression='->*')

  def test_extract_metadata_bigquery(self):

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

    mock_row = MockRow(id='dcid1',
                       name='Test Name',
                       measured_prop='Count',
                       population_type='Person',
                       stat_type='measuredValue',
                       p1='prop1',
                       v1='val1')
    batched_metadata_page = [mock_row]
    result = add_metadata.extract_metadata(batched_metadata_page,
                                           use_bigquery=True)
    self.assertEqual(len(result), 1)
    self.assertEqual(result[0]['dcid'], 'dcid1')
    self.assertEqual(result[0]['name'], 'Test Name')
    self.assertEqual(result[0]['constraintProperties'], ['prop1: val1'])

  @patch('google.genai.Client')
  def test_batch_generate_alt_sentences(self, mock_gemini_client):

    class MockParsed:

      def __init__(self, data):
        self._data = data

      def model_dump(self):
        return self._data

    mock_response_data = {
        "dcid": "dcid1",
        "generatedSentences": ["alt sentence 1", "alt sentence 2"]
    }
    mock_response = Mock()
    mock_response.parsed = [MockParsed(mock_response_data)]
    mock_gemini_client.return_value.aio.models.generate_content = unittest.mock.AsyncMock(
        return_value=mock_response)
    sv_metadata_list = [{
        "dcid": "dcid1",
        "name": "Test Name",
        "generatedSentences": None
    }]
    results, failed = asyncio.run(
        add_metadata.batch_generate_alt_sentences(sv_metadata_list, 'fake_key',
                                                  'fake_prompt'))
    self.assertEqual(len(results), 1)
    self.assertEqual(len(failed), 0)
    self.assertEqual(results[0]['dcid'], 'dcid1')
    self.assertEqual(len(results[0]['generatedSentences']), 2)
    mock_gemini_client.return_value.aio.models.generate_content.assert_called_once(
    )

  @patch('google.cloud.storage.Client')
  @patch('builtins.open', new_callable=unittest.mock.mock_open)
  @patch('os.makedirs')
  def test_export_to_json_local(self, mock_makedirs, mock_open,
                                mock_gcs_client):
    sv_metadata_list = [{"dcid": "dcid1", "name": "Test Name"}]
    add_metadata.export_to_json(sv_metadata_list, "test_file", False)
    mock_makedirs.assert_called_once_with("tools/nl/nl_metadata/failures",
                                          exist_ok=True)
    mock_open.assert_called_once_with("tools/nl/nl_metadata/test_file.json",
                                      "w")
    mock_open().write.assert_called_once()

  @patch('google.cloud.storage.Client')
  def test_export_to_json_gcs(self, mock_gcs_client):
    mock_bucket = Mock()
    mock_blob = Mock()
    mock_gcs_client.return_value.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob
    sv_metadata_list = [{"dcid": "dcid1", "name": "Test Name"}]
    add_metadata.export_to_json(sv_metadata_list, "test_file", True,
                                "test_folder")
    mock_gcs_client.return_value.bucket.assert_called_once_with(
        add_metadata.GCS_BUCKET)
    mock_bucket.blob.assert_called_once_with("test_folder/test_file.json")
    mock_blob.upload_from_string.assert_called_once()

  @patch('google.cloud.storage.Client')
  def test_read_sv_metadata_failed_attempts_gcs(self, mock_gcs_client):
    mock_bucket = Mock()
    mock_blob = Mock()
    mock_blob.name = "test_file.json"
    mock_blob.download_as_text.return_value = '{"dcid": "dcid1"}\n{"dcid": "dcid2"}'
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
         read_data='{"dcid": "dcid1"}\n')
  def test_read_sv_metadata_failed_attempts_local_folder(
      self, mock_open, mock_listdir, mock_isdir):
    result = add_metadata.read_sv_metadata_failed_attempts(
        "test_folder/", False)
    self.assertEqual(len(result), 1)
    self.assertEqual(len(result[0]), 1)
    self.assertEqual(result[0][0]['dcid'], 'dcid1')
    mock_open.assert_called_once_with("test_folder/test.json", "r")

