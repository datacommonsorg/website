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
"""Mock data for add_metadata_test.py"""

# Mock for argparse Namespace
MOCK_ARGS = {
    'generateAltSentences': True,
    'geminiApiKey': 'test_key',
    'language': 'French',
    'useGCS': True,
    'useBigQuery': True,
    'maxStatVars': 100,
    'gcsFolder': 'test_folder',
    'totalPartitions': 2,
    'currPartition': 1,
    'failedAttemptsPath': 'test/path'
}

# Mocks for get_prop_value
PROP_DATA_VALUE = {"nodes": [{"value": "test_value"}]}
PROP_DATA_NAME = {"nodes": [{"name": "test_name"}]}
PROP_DATA_DCID = {"nodes": [{"dcid": "test_dcid"}]}

# Mock for flatten_dc_api_response and extract_metadata_dc_api
DC_API_METADATA = {
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
DCID_TO_SENTENCE = {"dcid1": "Test sentence"}

# Mock for extract_constraint_properties_bigquery
BIGQUERY_ROW_DATA = {
    'p1': 'prop1',
    'v1': 'val1',
    'p2': 'prop2',
    'v2': 'val2',
    'p3': None,
    'v3': None,
    'p4': 'prop4',
    'v4': 'val4',
}

# Mock for extract_constraint_properties_dc_api
STATVAR_DATA_DC_API = {
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

# Mock for batch_generate_alt_sentences
GEMINI_SUCCESS_RESPONSE = {
    "dcid": "dcid1",
    "generatedSentences": ["alt sentence 1", "alt sentence 2"]
}
SV_METADATA_LIST_EMPTY_SENTENCES = [{
    "dcid": "dcid1",
    "name": "Test Name",
    "generatedSentences": None
}]

# Mock for export_to_json
SV_METADATA_LIST_MINIMAL = [{"dcid": "dcid1", "name": "Test Name"}]

# Mock for read_sv_metadata_failed_attempts
FAILED_ATTEMPTS_GCS = '{"dcid": "dcid1"}\n{"dcid": "dcid2"}'
FAILED_ATTEMPTS_LOCAL = '{"dcid": "dcid1"}\n'

# Mock for create_sv_metadata_nl
NL_CSV_DATA = {
    'dcid': ['dcid1', 'dcid2'],
    'sentence': ['sentence1', 'sentence2']
}

# Mock for extract_metadata_bigquery
BIGQUERY_MOCK_ROW_KWARGS = {
    'id': 'dcid1',
    'name': 'Test Name',
    'measured_prop': 'Count',
    'population_type': 'Person',
    'stat_type': 'measuredValue',
    'p1': 'prop1',
    'v1': 'val1'
}
