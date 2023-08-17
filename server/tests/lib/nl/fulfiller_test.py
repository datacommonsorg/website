# Copyright 2023 Google LLC
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
"""Integration tests for NL Next fulfillment."""

from typing import Dict, List
import unittest
from unittest.mock import patch

from server.lib.nl.common import constants
from server.lib.nl.common import counters as ctr
from server.lib.nl.common import rank_utils
from server.lib.nl.common import utils
from server.lib.nl.common import utterance
from server.lib.nl.common import variable
from server.lib.nl.detection import context
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import RankingType
from server.lib.nl.detection.types import SVDetection
import server.lib.nl.detection.types as nl_detection
from server.lib.nl.detection.utils import create_utterance
from server.lib.nl.fulfillment import base
from server.lib.nl.fulfillment import chart_vars
from server.lib.nl.fulfillment import fulfiller
from server.tests.lib.nl.test_utterance import COMPARISON_UTTR
from server.tests.lib.nl.test_utterance import CONTAINED_IN_UTTR
from server.tests.lib.nl.test_utterance import CORRELATION_UTTR
from server.tests.lib.nl.test_utterance import EVENT_UTTR
from server.tests.lib.nl.test_utterance import MULTISV_CORRELATION_UTTR
from server.tests.lib.nl.test_utterance import OVERVIEW_PLACE_ONLY_UTTR
from server.tests.lib.nl.test_utterance import RANKING_ACROSS_PLACES_UTTR
from server.tests.lib.nl.test_utterance import RANKING_ACROSS_SVS_UTTR
from server.tests.lib.nl.test_utterance import SIMPLE_BAR_DOWNGRADE_UTTR
from server.tests.lib.nl.test_utterance import SIMPLE_PLACE_ONLY_UTTR
from server.tests.lib.nl.test_utterance import SIMPLE_UTTR
from server.tests.lib.nl.test_utterance import SIMPLE_WITH_SV_EXT_UTTR
from server.tests.lib.nl.test_utterance import SIMPLE_WITH_TOPIC_UTTR
from server.tests.lib.nl.test_utterance import TIME_DELTA_ACROSS_VARS_UTTR
from shared.lib import detected_variables as dvars


#
# External interfaces that may need mocking:
# - variable.extend_svs
# - utils.sv_existence_for_places | utils.sv_existence_for_places_check_single_point
# - utils.get_sample_child_places
# - fulfillment.chart_vars.build_chart_vars
# - fulfillment.base.open_topics_ordered
#
class TestDataSpecNext(unittest.TestCase):

  def test_place_only(self):
    detection = _detection(
        'geoId/06',
        # Very low scores that we should ignore all SVs.
        ['Count_Person_Male', 'Count_Person_Female', 'Count_Person_Foo'],
        [0.4, 0.2, 0.1])

    got = _run(detection, [])

    self.maxDiff = None
    self.assertEqual(got, SIMPLE_PLACE_ONLY_UTTR)

  # Example: [male population in california]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'sv_existence_for_places_check_single_point')
  def test_simple(self, mock_sv_existence, mock_extend_svs):
    # First 2 SVs should be considered, and 3rd one dropped.
    detection = _detection(
        'geoId/06',
        ['Count_Person_Male', 'Count_Person_Female', 'Count_Person_Foo'],
        [0.6, 0.51, 0.4])

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Make SVs exist.  There are 2 calls for base SVs + extensions.
    mock_sv_existence.side_effect = [({
        'Count_Person_Male': False,
        'Count_Person_Female': False
    }, {})]

    got = _run(detection, [])

    self.maxDiff = None
    self.assertEqual(got, SIMPLE_UTTR)

  def test_simple_with_overview(self):
    # Query type simple with OVERVIEW classifier
    detection = _detection(
        'geoId/01',
        # Very low scores that we should ignore all SVs.
        ['Count_Farm', 'Income_Farm'],
        [0.4, 0.2],
        ClassificationType.OVERVIEW)

    got = _run(detection, [SIMPLE_UTTR])

    self.maxDiff = None
    self.assertEqual(got, OVERVIEW_PLACE_ONLY_UTTR)

  # Example: [male population in california]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'sv_existence_for_places_check_single_point')
  def test_simple_barchart_downgrade(self, mock_sv_existence, mock_extend_svs):
    constants.SV_BLOCKS_MAP['Count_Person_Male'] = ['census/NumMales']
    # First 3 SVs should be considered, and 4rd one dropped.
    # But since 1st SV blocks 3rd one, that should also be dropped.
    detection = _detection('geoId/06', [
        'Count_Person_Male', 'census/NumMales', 'Count_Person_Female',
        'Count_Person_Foo'
    ], [0.6, 0.55, 0.51, 0.4])

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    mock_sv_existence.side_effect = [({
        'Count_Person_Male': True,
        'Count_Person_Female': True
    }, {})]

    got = _run(detection, [])

    self.maxDiff = None
    self.assertEqual(got, SIMPLE_BAR_DOWNGRADE_UTTR)

  # This follows up on test_simple()
  # Example: [how many farms in its counties]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'get_sample_child_places')
  @patch.object(utils, 'sv_existence_for_places')
  def test_contained_in(self, mock_sv_existence, mock_child_places,
                        mock_extend_svs):
    # Detect a single SV for farms, with NO place.
    detection = _detection(None, ['Count_Farm', 'Income_Farm'], [0.6, 0.52],
                           ClassificationType.CONTAINED_IN)

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Return santa clara as child place
    mock_child_places.return_value = ['geoId/06085']
    # - Make SVs exist
    mock_sv_existence.side_effect = [(['Count_Farm', 'Income_Farm'], {})]

    got = _run(detection, [SIMPLE_UTTR])

    self.maxDiff = None
    self.assertEqual(got, CONTAINED_IN_UTTR)

  # This follows up on test_contained_in()
  # Example: [how does that correlate with rainfall]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'get_sample_child_places')
  @patch.object(utils, 'sv_existence_for_places')
  def test_correlation(self, mock_sv_existence, mock_child_places,
                       mock_extend_svs):
    # Detect a single SV for rainfall, with NO place.
    detection = _detection(None, ['Mean_Precipitation'], [0.6],
                           ClassificationType.CORRELATION)

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Return santa clara as child place
    mock_child_places.return_value = ['geoId/06085']
    # - Make SVs exist
    mock_sv_existence.side_effect = [(['Count_Farm', 'Income_Farm'], {}),
                                     (['Mean_Precipitation'], {})]

    # Pass in both simple and contained-in utterances.
    got = _run(detection, [SIMPLE_UTTR, CONTAINED_IN_UTTR])

    self.maxDiff = None
    self.assertEqual(got, CORRELATION_UTTR)

  # Multi-sv single query correlation
  # Example: [poverty vs. obesity]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'get_sample_child_places')
  @patch.object(utils, 'sv_existence_for_places')
  def test_multisv_correlation(self, mock_sv_existence, mock_child_places,
                               mock_extend_svs):
    # Detect a single SV for rainfall.
    detection = _detection('geoId/06', ['Mean_Precipitation'], [0.6],
                           ClassificationType.CORRELATION)
    detection.svs_detected.multi_sv = dvars.dict_to_multivar_candidates({
        'Candidates': [{
            'Parts': [{
                'QueryPart': 'obesity',
                'SV': ['Prevalence_Obesity'],
                'CosineScore': [0.9],
            }, {
                'QueryPart': 'poverty',
                'SV': ['Count_Poverty'],
                'CosineScore': [0.7],
            }],
            'AggCosineScore': 0.8,
            'DelimBased': True,
        }]
    })

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Return santa clara as child place
    mock_child_places.return_value = ['geoId/06085']
    # - Make SVs exist
    mock_sv_existence.side_effect = [(['Prevalence_Obesity'], {}),
                                     (['Count_Poverty'], {})]

    got = _run(detection, [])
    self.maxDiff = None
    self.assertEqual(got, MULTISV_CORRELATION_UTTR)

  # This follows up on test_correlation()
  # Example: [which counties have the most agricultural workers]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'get_sample_child_places')
  @patch.object(utils, 'sv_existence_for_places')
  def test_ranking_across_places(self, mock_sv_existence, mock_child_places,
                                 mock_extend_svs):
    # Ranking, no place and county too.
    detection = _detection(None, ['Count_Agricultural_Workers'], [0.6],
                           ClassificationType.RANKING)
    detection.classifications.append(
        NLClassifier(
            type=ClassificationType.CONTAINED_IN,
            attributes=nl_detection.ContainedInClassificationAttributes(
                contained_in_place_type=ContainedInPlaceType.COUNTY)))

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Return santa clara as child place
    mock_child_places.return_value = ['geoId/06085']
    # - Make SVs exist
    mock_sv_existence.side_effect = [(['Count_Agricultural_Workers'], {})]

    # Pass in both simple and contained-in utterances.
    got = _run(detection, [SIMPLE_UTTR, CONTAINED_IN_UTTR, CORRELATION_UTTR])

    self.maxDiff = None
    self.assertEqual(got, RANKING_ACROSS_PLACES_UTTR)

  # This follows up on test_simple()
  # Example: [how does that compare with nevada?]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'sv_existence_for_places')
  def test_comparison(self, mock_sv_existence, mock_extend_svs):
    # No SVs are detected.
    detection = _detection('geoId/32', [], [], ClassificationType.COMPARISON)

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Make SVs (from context) exist
    mock_sv_existence.side_effect = [
        (['Count_Person_Male', 'Count_Person_Female'], {})
    ]

    # Pass in the simple SV utterance as context
    got = _run(detection, [SIMPLE_UTTR])

    self.maxDiff = None
    self.assertEqual(got, COMPARISON_UTTR)

  # This exercises SV expansion to peers.
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'sv_existence_for_places_check_single_point')
  def test_simple_with_sv_extension(self, mock_sv_existence, mock_extend_svs):
    # Detect a single SV.
    detection = _detection('geoId/06', ['Count_Person_Male'], [0.6])

    # MOCK:
    # - Return gender extensions
    mock_extend_svs.return_value = {
        'Count_Person_Male': ['Count_Person_Male', 'Count_Person_Female']
    }
    # - Make SVs exist. Importantly, the second call is for both male + female.
    mock_sv_existence.side_effect = [({
        'Count_Person_Male': False
    }, {}), ({
        'Count_Person_Male': False,
        'Count_Person_Female': False
    }, {})]

    got = _run(detection, [])

    self.maxDiff = None
    self.assertEqual(got, SIMPLE_WITH_SV_EXT_UTTR)

  # This exercises Topic expansion.
  @patch.object(variable, 'extend_svs')
  @patch.object(chart_vars, 'build_chart_vars')
  @patch.object(utils, 'sv_existence_for_places_check_single_point')
  def test_simple_with_topic(self, mock_sv_existence, mock_topic_to_svs,
                             mock_extend_svs):
    # Detect a topic.
    detection = _detection('geoId/06', ['dc/topic/Agriculture'], [0.6])

    # MOCK:
    # - No extensions.
    mock_extend_svs.return_value = {}
    # - Return 3 ChartVars: two with an SV each, and another with an SVPG.
    mock_topic_to_svs.return_value = [
        base.ChartVars(svs=['Count_Farm'],
                       block_id=1,
                       include_percapita=False,
                       source_topic='dc/topic/Agriculture'),
        base.ChartVars(svs=['Area_Farm'],
                       block_id=1,
                       include_percapita=False,
                       source_topic='dc/topic/Agriculture'),
        base.ChartVars(svs=[
            'FarmInventory_Rice', 'FarmInventory_Wheat', 'FarmInventory_Barley'
        ],
                       block_id=2,
                       description='svpg desc',
                       include_percapita=False,
                       is_topic_peer_group=True)
    ]
    # - Make SVs exist. The order doesn't matter.
    #   Make Wheat inventory fail existence check.
    mock_sv_existence.side_effect = [({
        'Count_Farm': False,
        'Area_Farm': False,
        'FarmInventory_Rice': False,
        'FarmInventory_Barley': False
    }, {})]

    got = _run(detection, [])

    self.maxDiff = None
    self.assertEqual(got, SIMPLE_WITH_TOPIC_UTTR)

  # This follows up on test_simple().  It relies on topic as well.
  # Example: [what are the most grown agricultural things?]
  @patch.object(variable, 'extend_svs')
  @patch.object(rank_utils, 'rank_svs_by_latest_value')
  @patch.object(chart_vars, 'build_chart_vars')
  @patch.object(utils, 'sv_existence_for_places')
  def test_ranking_across_svs(self, mock_sv_existence, mock_topic_to_svs,
                              mock_rank_svs, mock_extend_svs):
    # Ranking, no place.
    detection = _detection(None, ['dc/topic/Agriculture'], [0.6],
                           ClassificationType.RANKING)

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    mock_topic_to_svs.return_value = [
        base.ChartVars(
            svs=['Count_Farm'],
            block_id=1,
            include_percapita=False,
        ),
        base.ChartVars(svs=[
            'FarmInventory_Rice', 'FarmInventory_Wheat', 'FarmInventory_Barley'
        ],
                       block_id=2,
                       include_percapita=False,
                       is_topic_peer_group=True,
                       source_topic='dc/topic/Agriculture')
    ]
    # - Make SVs exist
    mock_sv_existence.side_effect = [({
        'Count_Farm': False,
        'FarmInventory_Rice': False,
        'FarmInventory_Wheat': False,
        'FarmInventory_Barley': False
    }, {})]
    # Differently order result
    mock_rank_svs.return_value = [
        'FarmInventory_Barley',
        'FarmInventory_Rice',
        'FarmInventory_Wheat',
    ]

    # Pass in just simple utterance
    got = _run(detection, [SIMPLE_UTTR])

    self.maxDiff = None
    self.assertEqual(got, RANKING_ACROSS_SVS_UTTR)

  # This follows up on test_simple().  It relies on topic as well.
  # Example: [what are the most grown agricultural things?]
  @patch.object(variable, 'extend_svs')
  @patch.object(rank_utils, 'rank_svs_by_series_growth')
  @patch.object(chart_vars, 'build_chart_vars')
  @patch.object(utils, 'sv_existence_for_places')
  def test_time_delta(self, mock_sv_existence, mock_topic_to_svs, mock_rank_svs,
                      mock_extend_svs):
    # Ranking, no place.
    detection = _detection(None, ['dc/topic/AgricultureProduction'], [0.6],
                           ClassificationType.TIME_DELTA)

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    mock_topic_to_svs.return_value = [
        base.ChartVars(svs=[
            'FarmInventory_Rice', 'FarmInventory_Wheat', 'FarmInventory_Barley'
        ],
                       block_id=2,
                       include_percapita=False,
                       is_topic_peer_group=True,
                       source_topic='dc/topic/Agriculture')
    ]
    # - Make SVs exist
    mock_sv_existence.side_effect = [
        (['FarmInventory_Rice', 'FarmInventory_Wheat',
          'FarmInventory_Barley'], {})
    ]
    # Differently order result
    mock_rank_svs.return_value = rank_utils.GrowthRankedLists(
        pct=[
            'FarmInventory_Barley',
            'FarmInventory_Rice',
            'FarmInventory_Wheat',
        ],
        abs=[
            'FarmInventory_Rice',
            'FarmInventory_Barley',
            'FarmInventory_Wheat',
        ],
        pc=[
            'FarmInventory_Barley',
            'FarmInventory_Wheat',
        ])

    # Pass in just simple utterance
    got = _run(detection, [SIMPLE_UTTR])

    self.maxDiff = None
    self.assertEqual(got, TIME_DELTA_ACROSS_VARS_UTTR)

  @patch.object(utils, 'event_existence_for_place')
  def test_event(self, mock_event_existence):
    detection = _detection('geoId/06', [], [], ClassificationType.EVENT)
    mock_event_existence.return_value = True
    got = _run(detection, [])
    self.maxDiff = None
    self.assertEqual(got, EVENT_UTTR)

  # Example: [male population in california]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'sv_existence_for_places_check_single_point')
  def test_counters_simple(self, mock_sv_existence, mock_extend_svs):
    # First 2 SVs should be considered, and 3rd one dropped.
    detection = _detection(
        'geoId/06',
        ['Count_Person_Male', 'Count_Person_Female', 'Count_Person_Foo'],
        [0.6, 0.51, 0.4])

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Make SVs exist
    mock_sv_existence.side_effect = [({
        'Count_Person_Male': False,
        'Count_Person_Female': False
    }, {})]

    counters = ctr.Counters()
    fulfiller.fulfill(
        create_utterance(detection, None, counters, constants.TEST_SESSION_ID))
    got = counters.get()

    self.maxDiff = None
    _COUNTERS = {
        'filtered_svs': [['Count_Person_Male', 'Count_Person_Female']],
        'processed_fulfillment_types': ['simple'],
        'num_chart_candidates': 2,
        'stat_var_extensions': [{}]
    }
    # We don't want to compare TIMING
    self.assertEqual(got['INFO'], _COUNTERS)
    self.assertEqual(got['ERROR'], {})


# Helper to construct Detection() class.
def _detection(place: str,
               svs: List[str],
               scores: List[float],
               query_type: ClassificationType = ClassificationType.SIMPLE):
  if place:
    places_detected = PlaceDetection(query_original='foo sv in place',
                                     query_places_mentioned=[],
                                     query_without_place_substr='foo sv',
                                     places_found=[
                                         Place(dcid=place,
                                               name='Foo Place',
                                               place_type='State',
                                               country='country/USA')
                                     ],
                                     main_place=Place(dcid=place,
                                                      name='Foo Place',
                                                      place_type='State',
                                                      country='country/USA'))
  else:
    places_detected = None
  detection = Detection(original_query='foo sv in place',
                        cleaned_query='foo sv in place',
                        classifications=[],
                        places_detected=places_detected,
                        svs_detected=SVDetection(query='foo sv',
                                                 single_sv=dvars.VarCandidates(
                                                     svs=svs,
                                                     scores=scores,
                                                     sv2sentences={}),
                                                 multi_sv=None))
  if query_type == ClassificationType.COMPARISON:
    # Set comparison classifier
    detection.classifications = [
        NLClassifier(type=ClassificationType.COMPARISON,
                     attributes=nl_detection.ComparisonClassificationAttributes(
                         comparison_trigger_words=['compare']))
    ]
  elif query_type == ClassificationType.CONTAINED_IN:
    detection.classifications = [
        NLClassifier(
            type=ClassificationType.CONTAINED_IN,
            attributes=nl_detection.ContainedInClassificationAttributes(
                contained_in_place_type=ContainedInPlaceType.COUNTY))
    ]
  elif query_type == ClassificationType.CORRELATION:
    detection.classifications = [
        NLClassifier(
            type=ClassificationType.CORRELATION,
            attributes=nl_detection.CorrelationClassificationAttributes(
                correlation_trigger_words=['correlate']))
    ]
  elif query_type == ClassificationType.RANKING:
    detection.classifications = [
        NLClassifier(type=ClassificationType.RANKING,
                     attributes=nl_detection.RankingClassificationAttributes(
                         ranking_type=[RankingType.HIGH],
                         ranking_trigger_words=['most', 'highest']))
    ]
  elif query_type == ClassificationType.TIME_DELTA:
    detection.classifications = [
        NLClassifier(type=ClassificationType.TIME_DELTA,
                     attributes=nl_detection.TimeDeltaClassificationAttributes(
                         time_delta_types=[nl_detection.TimeDeltaType.INCREASE],
                         time_delta_trigger_words=['growth']))
    ]
  elif query_type == ClassificationType.EVENT:
    # Include ranking too.
    detection.classifications = [
        NLClassifier(type=ClassificationType.EVENT,
                     attributes=nl_detection.EventClassificationAttributes(
                         event_types=[nl_detection.EventType.FIRE],
                         event_trigger_words=['earthquake'])),
        NLClassifier(type=ClassificationType.RANKING,
                     attributes=nl_detection.RankingClassificationAttributes(
                         ranking_type=[RankingType.HIGH],
                         ranking_trigger_words=['most']))
    ]
  elif query_type == ClassificationType.OVERVIEW:
    detection.classifications = [
        NLClassifier(type=ClassificationType.OVERVIEW,
                     attributes=nl_detection.OverviewClassificationAttributes(
                         overview_trigger_words=['tell me']))
    ]

  return detection


def _run(detection: Detection, uttr_dict: List[Dict]):
  prev_uttr = None
  if uttr_dict:
    prev_uttr = utterance.load_utterance(uttr_dict)
  counters = ctr.Counters()
  uttr = create_utterance(detection, prev_uttr, counters,
                          constants.TEST_SESSION_ID)
  context.merge_with_context(uttr, is_explore=False)
  print(uttr)
  return utterance.save_utterance(fulfiller.fulfill(uttr))[0]
