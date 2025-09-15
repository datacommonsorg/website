# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may not a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Mock data for add_metadata_test.py"""

# Mock for argparse Namespace for the main E2E test
MOCK_E2E_ARGS = {
    'runMode': 'bigquery',
    'geminiApiKey': 'test_key',
    'language': 'English',
    'useGCS': True,
    'maxStatVars': None,
    'gcsFolder': None,
    'gcsFailureFolder': None,
    'totalPartitions': 1,
    'currPartition': 0,
    'output_filename': None,
    'delete_originals': False,
}

# Mock for argparse Namespace for the failed attempts E2E test
MOCK_FAILED_ATTEMPTS_E2E_ARGS = {
    'runMode': 'retry_failures',
    'geminiApiKey': 'test_key',
    'language': 'English',
    'useGCS': True,
    'maxStatVars': None,
    'gcsFolder': 'my-periodic-folder',
    'gcsFailureFolder': 'gs://some/failed/path/',
    'totalPartitions': 1,
    'currPartition': 0,
    'output_filename': None,
    'delete_originals': False,
}

# Mock for argparse Namespace for the NL E2E test
MOCK_NL_E2E_ARGS = {
    'runMode': 'nl_only',
    'geminiApiKey': 'test_key',
    'language': 'English',
    'useGCS': True,
    'maxStatVars': None,
    'gcsFolder': None,
    'gcsFailureFolder': None,
    'totalPartitions': 1,
    'currPartition': 0,
    'output_filename': None,
    'delete_originals': False,
}

# Mock BigQuery Row data
BIGQUERY_MOCK_ROW_KWARGS_1 = {
    'id': 'dcid1',
    'name': 'Test Name 1',
    'measured_prop': 'Count',
    'population_type': 'Person',
    'stat_type': 'measuredValue',
    'p1': 'prop1',
    'v1': 'val1'
}

BIGQUERY_MOCK_ROW_KWARGS_2 = {
    'id': 'dcid2',
    'name': 'Test Name 2',
    'measured_prop': 'Count',
    'population_type': 'Person',
    'stat_type': 'measuredValue',
    'p1': 'prop2',
    'v1': 'val2'
}

# Mock data for the results of batch_generate_alt_sentences
GEMINI_SUCCESS_RESULT = {
    'dcid': 'dcid1',
    'name': 'Test Name 1',
    'measuredProperty': 'Count',
    'populationType': 'Person',
    'statType': 'measuredValue',
    'constraintProperties': ['prop1: val1'],
    'numConstraints': 1,
    'sentence': None,
    'generatedSentences': ['alt sentence 1', 'alt sentence 2']
}

GEMINI_FAILURE_RESULT = {
    'dcid': 'dcid2',
    'name': 'Test Name 2',
    'measuredProperty': 'Count',
    'populationType': 'Person',
    'statType': 'measuredValue',
    'constraintProperties': ['prop2: val2'],
    'numConstraints': 1,
    'sentence': None,
    'generatedSentences': None
}

# Mock data representing the content of a failed attempts file
MOCK_FAILED_ATTEMPT_DATA = [{
    'dcid': 'dcid3',
    'name': 'Test Name 3',
    'measuredProperty': 'Count',
    'populationType': 'Person',
    'statType': 'measuredValue',
    'constraintProperties': ['prop3: val3'],
    'numConstraints': 1,
    'sentence': None,
    'generatedSentences': None
}]

# Mock successful Gemini result for the retried data
GEMINI_RETRY_SUCCESS_RESULT = {
    'dcid': 'dcid3',
    'name': 'Test Name 3',
    'measuredProperty': 'Count',
    'populationType': 'Person',
    'statType': 'measuredValue',
    'constraintProperties': ['prop3: val3'],
    'numConstraints': 1,
    'sentence': None,
    'generatedSentences': ['alt sentence 3', 'alt sentence 4']
}

# Mock data for create_sv_metadata_nl
MOCK_NL_SV_DATA = [{'dcid4': 'NL sentence for dcid4'}]

# Mock DC API response for extract_metadata
MOCK_DC_API_RESPONSE = {
    "data": {
        "dcid4": {
            "arcs": {
                "name": {
                    "nodes": [{
                        "value": "Test Name 4"
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
                        "dcid": "prop4",
                        "name": "Property 4"
                    }]
                },
                "prop4": {
                    "nodes": [{
                        "value": "value4"
                    }]
                }
            }
        }
    }
}

# Mock successful Gemini result for the NL data
GEMINI_NL_SUCCESS_RESULT = {
    'dcid': 'dcid4',
    'name': 'Test Name 4',
    'measuredProperty': 'Count',
    'populationType': 'Person',
    'statType': 'measuredValue',
    'constraintProperties': ['Property 4: value4'],
    'numConstraints': 1,
    'sentence': 'NL sentence for dcid4',
    'generatedSentences': ['alt sentence 5', 'alt sentence 6']
}

# Mock for argparse Namespace for the compact mode test
MOCK_COMPACT_ARGS = {
    'runMode': 'compact',
    'gcsFolder': 'my-periodic-folder',
    'delete_originals': False,
    # Other args that are not used in this mode are set to None
    'geminiApiKey': None,
    'language': None,
    'useGCS': True,  # Assumed for this test
    'maxStatVars': None,
    'gcsFailureFolder': None,
    'totalPartitions': 1,
    'currPartition': 0,
    'output_filename': 'compacted_test.jsonl',
}

# Mock for argparse Namespace for the compact mode test with deletion
MOCK_COMPACT_ARGS_WITH_DELETE = MOCK_COMPACT_ARGS.copy()
MOCK_COMPACT_ARGS_WITH_DELETE['delete_originals'] = True

# Mock for argparse Namespace for the diffs mode test
MOCK_DIFFS_ARGS = {
    'runMode': 'bigquery_diffs',
    'gcsFolder': 'my-periodic-folder',
    'useGCS': True,
    'totalPartitions': 1,
    'currPartition': 0,
    'geminiApiKey': 'test_key',
    # Other args not used in this test
    'language': 'English',
    'maxStatVars': None,
    'gcsFailureFolder': None,
    'output_filename': None,
    'delete_originals': False,
}
