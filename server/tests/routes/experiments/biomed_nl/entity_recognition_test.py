# # Copyright 2025 Google LLC
# #
# # Licensed under the Apache License, Version 2.0 (the "License");
# # you may not use this file except in compliance with the License.
# # You may obtain a copy of the License at
# #
# #      http://www.apache.org/licenses/LICENSE-2.0
# #
# # Unless required by applicable law or agreed to in writing, software
# # distributed under the License is distributed on an "AS IS" BASIS,
# # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# # See the License for the specific language governing permissions and
# # limitations under the License.

import unittest
from unittest import mock

from deepdiff import DeepDiff

from server.routes.experiments.biomed_nl.entity_recognition import \
    annotate_query_with_types
from server.routes.experiments.biomed_nl.entity_recognition import \
    identify_query_traversal_start
from server.routes.experiments.biomed_nl.entity_recognition import \
    recognize_entities_from_query
from server.routes.experiments.biomed_nl.entity_recognition import \
    sample_dcids_by_type
from server.routes.experiments.biomed_nl.entity_recognition import \
    sanitize_query


class TestQuerySanitization(unittest.TestCase):

  def test_sanitize_query(self):
    assert sanitize_query(
        'query ends in question mark?') == 'query ends in question mark'
    assert sanitize_query(
        'query about entity1, entity2, and entity removes commas'
    ) == 'query about entity1 entity2 and entity removes commas'
    assert sanitize_query("entity's query with apostrophe is removed"
                         ) == 'entity query with apostrophe is removed'


class TestRecognizeEntities(unittest.TestCase):

  def setUp(self):
    self.fetch_types_response = {
        'dc/1': [
            {
                'dcid': 'dc/typeA',
                'name': 'TypeA',
                'types': ['Class'],
            },
            {
                'dcid': 'dc/typeB',
                'name': 'TypeB',
                'types': ['Class'],
            },
        ],
        'dc/2': [{
            'dcid': 'dc/typeB',
            'name': 'TypeB',
            'types': ['Class'],
        },],
        'dc/3': [
            {
                'dcid': 'dc/typeB',
                'name': 'TypeB',
                'types': ['Class'],
            },
            {
                'dcid': 'dc/typeC',
                'name': 'TypeC',
                'types': ['Class'],
            },
        ],
    }

    self.fetch_types_side_effect = lambda dcids, _: {
        key: self.fetch_types_response[key] for key in dcids
    }

    self.v1_recognize_entities_response = [{
        "span": "entity1",
        "entities": [{
            "dcid": "dc/1"
        }]
    }, {
        "span": "second entity",
        "entities": [{
            "dcid": "dc/2"
        }, {
            "dcid": "dc/3"
        }]
    }]

  @mock.patch('server.lib.fetch.raw_property_values')
  def test_sample_dcids_adds_all_unique_types_exceeding_sample_size(
      self, mock_fetch):
    input_dcids = ['dc/1', 'dc/2', 'dc/3']

    mock_fetch.side_effect = [self.fetch_types_response]

    sampled_dcids, unique_types = sample_dcids_by_type(input_dcids, 1)

    mock_fetch.assert_called_once_with(input_dcids, 'typeOf')
    assert set(sampled_dcids) == {'dc/1', 'dc/3'}
    assert set(unique_types) == {'TypeA', 'TypeB', 'TypeC'}

  @mock.patch('server.lib.fetch.raw_property_values')
  def test_sample_dcids_adds_skipped_dcids_from_first_pass(self, mock_fetch):
    input_dcids = ['dc/1', 'dc/2', 'dc/3']

    mock_fetch.side_effect = self.fetch_types_side_effect

    sampled_dcids, unique_types = sample_dcids_by_type(input_dcids, 3)

    mock_fetch.assert_called_once_with(input_dcids, 'typeOf')
    assert set(sampled_dcids) == {'dc/1', 'dc/2', 'dc/3'}
    assert set(unique_types) == {'TypeA', 'TypeB', 'TypeC'}

  @mock.patch('server.lib.fetch.raw_property_values')
  @mock.patch('server.services.datacommons.recognize_entities')
  def test_recognize_entities(self, mock_recognize, mock_fetch_types):

    mock_recognize.side_effect = [self.v1_recognize_entities_response]
    mock_fetch_types.side_effect = self.fetch_types_side_effect

    query = "query containing entity1 and second entity"
    entities_to_dcids, entities_to_recognized_types = recognize_entities_from_query(
        query)

    mock_recognize.assert_called_once_with(query)
    mock_fetch_types.assert_has_calls(
        [mock.call(['dc/1'], 'typeOf'),
         mock.call(['dc/2', 'dc/3'], 'typeOf')])

    assert DeepDiff(entities_to_dcids, {
        'entity1': ['dc/1'],
        'second entity': ['dc/2', 'dc/3']
    },
                    ignore_order=True) == {}

    assert DeepDiff(entities_to_recognized_types, {
        'entity1': ['TypeA', 'TypeB'],
        'second entity': ['TypeB', 'TypeC']
    },
                    ignore_order=True) == {}

  def test_annotate_query_with_types(self):
    query = "query containing entity1 and second entity"
    entities_to_types = {
        'entity1': ['TypeA', 'TypeB'],
        'second entity': ['TypeB', 'TypeC']
    }
    assert annotate_query_with_types(
        query, entities_to_types
    ) == "query containing [entity1 (typeOf: TypeA, TypeB)] and [second entity (typeOf: TypeB, TypeC)]"

  @mock.patch('server.lib.fetch.raw_property_values')
  @mock.patch('server.services.datacommons.recognize_entities')
  @mock.patch('google.genai.Client')
  def test_gemini_fails_to_find_start(self, MockClient, mock_recognize,
                                      mock_fetch_types):
    mock_recognize.side_effect = [self.v1_recognize_entities_response]
    mock_fetch_types.side_effect = self.fetch_types_side_effect

    mocked_response_text = "NONE"
    mock_gemini_response = mock.MagicMock(text=mocked_response_text,
                                          usage_metadata=mock.MagicMock(
                                              prompt_token_count=10,
                                              candidates_token_count=100))
    mock_client_instance = mock.MagicMock()
    mock_client_instance.models.generate_content.return_value = mock_gemini_response
    MockClient.return_value = mock_client_instance

    query = "query containing entity1 and second entity"
    (entities_to_dcids, selected_entities, annotated_query,
     response_token_counts) = identify_query_traversal_start(
         query, 'test_api_key')

    assert MockClient.call_args[1]['api_key'] == 'test_api_key'
    assert (entities_to_dcids, selected_entities, annotated_query,
            response_token_counts) == (None, None, None, (10, 100))

  @mock.patch('server.lib.fetch.raw_property_values')
  @mock.patch('server.services.datacommons.recognize_entities')
  @mock.patch('google.genai.Client')
  def test_gemini_fails_to_find_start(self, MockClient, mock_recognize,
                                      mock_fetch_types):
    mock_recognize.side_effect = [self.v1_recognize_entities_response]
    mock_fetch_types.side_effect = self.fetch_types_side_effect
    mocked_response_text = "second entity\nentity1"
    mock_gemini_response = mock.MagicMock(text=mocked_response_text,
                                          usage_metadata=mock.MagicMock(
                                              prompt_token_count=10,
                                              candidates_token_count=100))
    mock_client_instance = mock.MagicMock()
    mock_client_instance.models.generate_content.return_value = mock_gemini_response
    MockClient.return_value = mock_client_instance

    query = "query containing entity1 and second entity"
    (entities_to_dcids, selected_entities, annotated_query,
     response_token_counts) = identify_query_traversal_start(
         query, 'test_api_key')

    assert MockClient.call_args[1]['api_key'] == 'test_api_key'
    assert DeepDiff(entities_to_dcids, {
        'entity1': ['dc/1'],
        'second entity': ['dc/2', 'dc/3']
    },
                    ignore_order=True) == {}
    assert selected_entities == ['second entity', 'entity1']
    assert annotated_query == 'query containing [entity1 (typeOf: TypeA, TypeB)] and [second entity (typeOf: TypeB, TypeC)]'
    assert response_token_counts == (10, 100)
