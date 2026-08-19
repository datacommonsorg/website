# Copyright 2026 Google LLC
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

import unittest
from unittest.mock import MagicMock
from unittest.mock import patch

from flask import Flask

from server.lib.nl.common import topic


class TestTopicFallback(unittest.TestCase):

  def setUp(self):
    self.app = Flask(__name__)

  def test_members_cached(self):
    mock_cache = MagicMock()
    mock_cache.out_map = {'dc/topic/CachedTopic': MagicMock()}
    mock_cache.get_members.return_value = [{'dcid': 'sv1'}, {'dcid': 'sv2'}]
    self.app.config['TOPIC_CACHE'] = {'main': mock_cache}

    with self.app.app_context():
      res = topic._members('dc/topic/CachedTopic', 'relevantVariable', 'main')
      self.assertEqual(res, ['sv1', 'sv2'])
      mock_cache.get_members.assert_called_once_with('dc/topic/CachedTopic')

  @patch('server.lib.nl.common.topic.is_feature_enabled')
  @patch('server.lib.fetch.property_values')
  def test_members_fallback(self, mock_property_values,
                            mock_is_feature_enabled):
    mock_is_feature_enabled.return_value = True
    mock_cache = MagicMock()
    mock_cache.out_map = {}
    mock_cache.get_members.return_value = []
    self.app.config['TOPIC_CACHE'] = {'main': mock_cache}

    mock_property_values.return_value = {
        'dc/topic/DynamicTopic': ['sv1, sv2', 'sv2, sv3']
    }

    with self.app.app_context():
      res = topic._members('dc/topic/DynamicTopic', 'relevantVariable', 'main')
      self.assertEqual(res, ['sv1', 'sv2', 'sv3'])
      mock_property_values.assert_called_once_with(
          nodes=['dc/topic/DynamicTopic'], prop='relevantVariableList')

  @patch('server.lib.nl.common.topic.is_feature_enabled')
  @patch('server.lib.fetch.property_values')
  def test_members_flag_disabled_no_fallback(self, mock_property_values,
                                             mock_is_feature_enabled):
    mock_is_feature_enabled.return_value = False
    mock_cache = MagicMock()
    mock_cache.out_map = {}
    mock_cache.get_members.return_value = []
    self.app.config['TOPIC_CACHE'] = {'main': mock_cache}

    with self.app.app_context():
      res = topic._members('dc/topic/DynamicTopic', 'relevantVariable', 'main')
      self.assertEqual(res, [])
      mock_property_values.assert_not_called()

  def test_members_empty_or_none(self):
    with self.app.app_context():
      self.assertEqual(topic._members('', 'relevantVariable', 'main'), [])
      self.assertEqual(topic._members(None, 'relevantVariable', 'main'), [])

  @patch('server.lib.nl.common.topic.is_feature_enabled')
  @patch('server.lib.fetch.raw_property_values')
  def test_members_raw_fallback_and_dedup(self, mock_raw_property_values,
                                          mock_is_feature_enabled):
    mock_is_feature_enabled.return_value = True
    mock_cache = MagicMock()
    mock_cache.out_map = {'dc/topic/Cached': MagicMock()}

    def fake_get_members(n):
      if n == 'dc/topic/Cached':
        return [{
            'dcid': 'sv1',
            'name': 'SV 1',
            'types': ['StatisticalVariable']
        }]
      return []

    mock_cache.get_members.side_effect = fake_get_members
    self.app.config['TOPIC_CACHE'] = {'main': mock_cache}

    mock_raw_property_values.return_value = {
        'dc/topic/Dynamic': [{
            'dcid': 'sv2',
            'name': 'SV 2',
            'types': ['StatisticalVariable']
        }]
    }

    with self.app.app_context():
      # Passing duplicate 'dc/topic/Dynamic' to verify request deduplication
      res = topic._members_raw(
          ['dc/topic/Cached', 'dc/topic/Dynamic', 'dc/topic/Dynamic'],
          'relevantVariable', 'main')
      self.assertEqual(len(res), 2)
      self.assertEqual(res['dc/topic/Cached'], [{
          'dcid': 'sv1',
          'name': 'SV 1',
          'types': ['StatisticalVariable']
      }])
      self.assertEqual(res['dc/topic/Dynamic'], [{
          'dcid': 'sv2',
          'name': 'SV 2',
          'types': ['StatisticalVariable']
      }])
      mock_raw_property_values.assert_called_once_with(
          nodes=['dc/topic/Dynamic'], prop='relevantVariable')

  @patch('server.lib.nl.common.topic.is_feature_enabled')
  @patch('server.lib.fetch.raw_property_values')
  def test_members_raw_flag_disabled_no_fallback(self, mock_raw_property_values,
                                                 mock_is_feature_enabled):
    mock_is_feature_enabled.return_value = False
    mock_cache = MagicMock()
    mock_cache.out_map = {'dc/topic/Cached': MagicMock()}
    mock_cache.get_members.return_value = []
    self.app.config['TOPIC_CACHE'] = {'main': mock_cache}

    with self.app.app_context():
      res = topic._members_raw(['dc/topic/Cached', 'dc/topic/Dynamic'],
                               'relevantVariable', 'main')
      self.assertEqual(res, {'dc/topic/Cached': [], 'dc/topic/Dynamic': []})
      mock_raw_property_values.assert_not_called()

  @patch('server.lib.fetch.raw_property_values')
  def test_members_raw_fetch_none_or_empty(self, mock_raw_property_values):
    mock_raw_property_values.return_value = None
    with self.app.app_context():
      res = topic._members_raw(['dc/topic/NonExistent'], 'relevantVariable',
                               'main')
      self.assertEqual(res, {'dc/topic/NonExistent': []})

  @patch('server.lib.fetch.raw_property_values')
  def test_parents_raw_fallback(self, mock_raw_property_values):
    # When TOPIC_CACHE is absent, it queries raw graph with out=False
    mock_raw_property_values.return_value = {
        'sv_dynamic': [{
            'dcid': 'dc/topic/DynamicParent',
            'name': 'Dynamic Parent',
            'types': ['Topic'],
            'value': 'extra'
        }, {
            'dcid': 'non_topic_parent',
            'name': 'Invalid',
            'types': ['SomethingElse']
        }, {
            'dcid': 'dc/topic/DynamicParent',
            'name': 'Duplicate Dynamic Parent',
            'types': ['Topic']
        }]
    }

    with self.app.app_context():
      res = topic._parents_raw(['sv_dynamic'], 'relevantVariable', 'main')
      # 'non_topic_parent' should be filtered out, 'value' deleted, and duplicates deduplicated
      self.assertEqual(res, [{
          'dcid': 'dc/topic/DynamicParent',
          'name': 'Dynamic Parent',
          'types': ['Topic']
      }])
      mock_raw_property_values.assert_called_once_with(nodes=['sv_dynamic'],
                                                       prop='relevantVariable',
                                                       out=False)

  @patch('server.lib.fetch.raw_property_values')
  def test_parents_raw_fetch_none_or_empty(self, mock_raw_property_values):
    mock_raw_property_values.return_value = None
    with self.app.app_context():
      res = topic._parents_raw(['sv_nonexistent'], 'relevantVariable', 'main')
      self.assertEqual(res, [])

  @patch('server.lib.fetch.property_values')
  def test_prop_val_ordered(self, mock_property_values):
    mock_property_values.return_value = {
        'node1': ['sv1, sv2, sv1', 'sv3,  sv2 , sv4', '', None, 123]
    }
    res = topic._prop_val_ordered('node1', 'relevantVariableList')
    self.assertEqual(res, ['sv1', 'sv2', 'sv3', 'sv4'])

  def test_prop_val_ordered_empty_node(self):
    self.assertEqual(topic._prop_val_ordered('', 'relevantVariableList'), [])
    self.assertEqual(topic._prop_val_ordered(None, 'relevantVariableList'), [])

  @patch('server.lib.fetch.property_values')
  def test_get_topic_vars(self, mock_property_values):
    # Override topic
    self.assertEqual(
        topic.get_topic_vars('dc/topic/AgricultureEmissionsByGas', 'main'),
        ['dc/svpg/AgricultureEmissionsByGas'])

    # Non-topic
    self.assertEqual(topic.get_topic_vars('Count_Person', 'main'), [])

    # Dynamic topic fallback
    mock_property_values.return_value = {'dc/topic/Custom': ['sv1, sv2']}
    with self.app.app_context():
      self.assertEqual(topic.get_topic_vars('dc/topic/Custom', 'main'),
                       ['sv1', 'sv2'])

  @patch('server.lib.fetch.raw_property_values')
  def test_get_child_topics(self, mock_raw_property_values):
    mock_raw_property_values.return_value = {
        'dc/topic/Parent': [
            {
                'dcid': 'dc/topic/Child1',
                'name': 'Child 1',
                'types': ['Topic']
            },
            {
                'dcid': 'Count_Person',  # Not a topic
                'name': 'Person Count',
                'types': ['StatisticalVariable']
            },
            {
                'dcid': 'dc/topic/Parent',  # Self-reference
                'name': 'Self',
                'types': ['Topic']
            }
        ]
    }
    with self.app.app_context():
      res = topic.get_child_topics(['dc/topic/Parent'], 'main')
      self.assertEqual(res, [{
          'dcid': 'dc/topic/Child1',
          'name': 'Child 1',
          'types': ['Topic']
      }])

  @patch('server.lib.fetch.raw_property_values')
  def test_get_parent_topics_for_sv(self, mock_raw_property_values):
    # SV queries member prop first to find SVPG, then relevantVariable on SVPG + SV
    mock_raw_property_values.side_effect = [
        # SVPG lookup: 'member'
        {
            'Count_Person': [{
                'dcid': 'dc/svpg/Demographics',
                'name': 'Demographics',
                'types': ['StatVarPeerGroup']
            }]
        },
        # Topic lookup: 'relevantVariable' on ['dc/svpg/Demographics', 'Count_Person']
        {
            'dc/svpg/Demographics': [{
                'dcid': 'dc/topic/DemographicsTopic',
                'name': 'Demographics Topic',
                'types': ['Topic']
            }],
            'Count_Person': []
        }
    ]
    with self.app.app_context():
      res = topic.get_parent_topics('Count_Person', 'main')
      self.assertEqual(res, [{
          'dcid': 'dc/topic/DemographicsTopic',
          'name': 'Demographics Topic',
          'types': ['Topic']
      }])


class TestSchemaDrivenClassification(unittest.TestCase):

  def setUp(self):
    self.app = Flask(__name__)

  @patch('server.lib.nl.common.utils.is_feature_enabled')
  def test_utils_classification_flag_enabled(self, mock_is_feature_enabled):
    from server.lib.nl.common import utils
    mock_is_feature_enabled.return_value = True

    with self.app.app_context():
      # Namespace matching
      self.assertTrue(utils.is_topic('custom/topic/DisplacedPersons'))
      self.assertTrue(utils.is_topic('dc/topic/Poverty'))
      self.assertTrue(utils.is_svpg('custom/svpg/IDP_By_Region'))
      self.assertTrue(utils.is_svg('custom/g/CustomGroup'))
      self.assertFalse(utils.is_sv('custom/topic/DisplacedPersons'))
      self.assertFalse(utils.is_sv('custom/g/CustomGroup'))
      self.assertTrue(utils.is_sv('Count_Person_Displaced_RegionA'))

      # Type map override
      type_map = {
          'arbitrary_node_1': 'Topic',
          'arbitrary_node_2': 'StatVarPeerGroup',
          'arbitrary_node_3': 'StatVarGroup',
          'arbitrary_node_4': 'StatisticalVariable'
      }
      self.assertTrue(utils.is_topic('arbitrary_node_1', type_map))
      self.assertTrue(utils.is_svpg('arbitrary_node_2', type_map))
      self.assertTrue(utils.is_svg('arbitrary_node_3', type_map))
      self.assertTrue(utils.is_sv('arbitrary_node_4', type_map))
      self.assertFalse(utils.is_sv('arbitrary_node_1', type_map))

  @patch('server.lib.nl.common.utils.is_feature_enabled')
  def test_utils_classification_flag_disabled(self, mock_is_feature_enabled):
    from server.lib.nl.common import utils
    mock_is_feature_enabled.return_value = False

    with self.app.app_context():
      # Base DC legacy behavior
      self.assertFalse(utils.is_topic('custom/topic/DisplacedPersons'))
      self.assertTrue(utils.is_topic('dc/topic/Poverty'))
      self.assertTrue(utils.is_topic('c/topic/CustomLegacy'))
      self.assertFalse(utils.is_svpg('custom/svpg/IDP_By_Region'))
      self.assertTrue(utils.is_svpg('dc/svpg/PeerGroup'))
      self.assertFalse(utils.is_svg('custom/g/CustomGroup'))
      self.assertTrue(utils.is_svg('dc/g/Group'))

  def test_resolve_entity_to_var_candidates_with_types(self):
    from shared.lib import detected_variables as dvars
    entity = {
        'candidates': [{
            'dcid':
                'custom/topic/DisplacedPersons',
            'typeOf': ['Topic'],
            'metadata': {
                'score': '0.86',
                'sentence': 'Displaced Persons'
            },
            'children': [{
                'dcid': 'custom/svpg/IDP_By_Region',
                'typeOf': ['StatVarPeerGroup']
            }, {
                'dcid': 'Count_Person_Displaced_RegionB',
                'typeOf': ['StatisticalVariable']
            }]
        }, {
            'dcid': 'Count_Person_Displaced_RegionA',
            'typeOf': ['StatisticalVariable'],
            'metadata': {
                'score': '0.75',
                'sentence': 'Displaced Persons in Region A'
            }
        }]
    }
    candidates = dvars.resolve_entity_to_var_candidates(entity)
    self.assertEqual(
        candidates.svs,
        ['custom/topic/DisplacedPersons', 'Count_Person_Displaced_RegionA'])
    self.assertEqual(
        candidates.sv2types, {
            'custom/topic/DisplacedPersons': 'Topic',
            'custom/svpg/IDP_By_Region': 'StatVarPeerGroup',
            'Count_Person_Displaced_RegionB': 'StatisticalVariable',
            'Count_Person_Displaced_RegionA': 'StatisticalVariable'
        })

    # Test serialization roundtrip
    data = dvars.var_candidates_to_dict(candidates)
    self.assertIn('SV_to_Types', data)
    self.assertEqual(data['SV_to_Types']['custom/topic/DisplacedPersons'],
                     'Topic')
    self.assertEqual(data['SV_to_Types']['custom/svpg/IDP_By_Region'],
                     'StatVarPeerGroup')
