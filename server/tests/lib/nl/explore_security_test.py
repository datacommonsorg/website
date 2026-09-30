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
"""Tests for limits on topic expansion and chart fulfillment in Explore."""

import unittest
from unittest.mock import patch

from flask import Flask

from server.lib.nl.common import counters as ctr
from server.lib.nl.common import topic as common_topic
from server.lib.nl.common import utils
from server.lib.nl.common import variable
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection
from server.lib.nl.detection.utils import create_utterance
from server.lib.nl.explore import params
from server.lib.nl.explore import topic as explore_topic
from server.lib.nl.fulfillment import base as fulfillment_base
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.routes.explore import helpers as explore_helpers
from shared.lib import detected_variables as dvars


def _make_utterance(svs, places=None, insight_ctx=None):
  if places is None:
    places = [Place(dcid='Earth', name='World', place_type='Place', country='')]
  place_detection = PlaceDetection(
      query_original='test query',
      query_places_mentioned=[],
      query_entities_mentioned=[],
      query_without_place_substr='test query',
      places_found=places,
      entities_found=[],
      main_place=places[0],
  )
  detection = Detection(
      original_query='test query',
      cleaned_query='test query',
      classifications=[],
      places_detected=place_detection,
      svs_detected=SVDetection(
          query='test query',
          single_sv=dvars.VarCandidates(svs=svs,
                                        scores=[0.9] * len(svs),
                                        sv2sentences={}),
          prop=dvars.VarCandidates(svs=[], scores=[], sv2sentences={}),
          multi_sv=None,
          sv_threshold=0.5,
          model_threshold=0.5,
      ),
  )
  uttr = create_utterance(detection, None, ctr.Counters(), 'test_session')
  uttr.places = list(places)
  uttr.svs = list(svs)
  uttr.insight_ctx = insight_ctx or {}
  return uttr


class TestParameterBounds(unittest.TestCase):
  """Verifies server-side clamping and sanitization of maxTopics, maxTopicSvs, and maxCharts."""

  def setUp(self):
    self.app = Flask(__name__)

  def test_high_params_are_clamped_in_request(self):
    with self.app.test_request_context(
        '/api/explore/detect-and-fulfill?maxTopics=99999&maxTopicSvs=99999&maxCharts=99999'
    ):
      from flask import request
      uttr = _make_utterance(['dc/topic/Root'])
      explore_helpers.update_insight_ctx_for_chart_fulfill(
          request, uttr, 'custom')

      self.assertLessEqual(uttr.insight_ctx[params.Params.MAX_TOPICS],
                           params.MAX_TOPICS_LIMIT)
      self.assertLessEqual(uttr.insight_ctx[params.Params.MAX_TOPIC_SVS],
                           params.MAX_TOPIC_SVS_LIMIT)
      self.assertLessEqual(uttr.insight_ctx[params.Params.MAX_CHARTS],
                           params.MAX_CHARTS_LIMIT)

  def test_zero_negative_and_non_numeric_params_are_sanitized(self):
    with self.app.test_request_context(
        '/api/explore/detect-and-fulfill?maxTopics=0&maxTopicSvs=-10&maxCharts=not_a_number'
    ):
      from flask import request
      uttr = _make_utterance(['dc/topic/Root'])
      explore_helpers.update_insight_ctx_for_chart_fulfill(
          request, uttr, 'custom')

      # Zero, negative, or non-numeric values must not remain as 0, negative, or strings.
      for key in (
          params.Params.MAX_TOPICS,
          params.Params.MAX_TOPIC_SVS,
          params.Params.MAX_CHARTS,
      ):
        val = uttr.insight_ctx.get(key)
        self.assertTrue(
            val is None or (isinstance(val, int) and val >= 1),
            f'Expected None or positive int for {key}, got {val!r}',
        )

  def test_getter_helpers_enforce_bounds_even_if_insight_ctx_mutated(self):
    # Even if insight_ctx is populated directly from JSON body in /api/explore/fulfill,
    # the limit getters must clamp to [1, MAX_*_LIMIT].
    uttr = _make_utterance(
        ['dc/topic/Root'],
        insight_ctx={
            params.Params.DC.value: 'custom',
            params.Params.MAX_TOPICS.value: 50000,
            params.Params.MAX_TOPIC_SVS.value: 50000,
            params.Params.MAX_CHARTS.value: 50000,
        },
    )
    state = PopulateState(uttr=uttr)
    self.assertLessEqual(explore_topic._max_topics_to_open(uttr),
                         params.MAX_TOPICS_LIMIT)
    self.assertLessEqual(explore_topic._max_subtopic_sv_limit(state),
                         params.MAX_TOPIC_SVS_LIMIT)
    self.assertLessEqual(fulfillment_base._get_max_num_charts(state),
                         params.MAX_CHARTS_LIMIT)

    # Zero or string values in insight_ctx must not bypass limits or raise TypeError.
    uttr_zero = _make_utterance(
        ['dc/topic/Root'],
        insight_ctx={
            params.Params.DC.value: 'custom',
            params.Params.MAX_TOPICS.value: 0,
            params.Params.MAX_TOPIC_SVS.value: 0,
            params.Params.MAX_CHARTS.value: 'invalid',
        },
    )
    state_zero = PopulateState(uttr=uttr_zero)
    self.assertGreaterEqual(explore_topic._max_topics_to_open(uttr_zero), 1)
    self.assertGreaterEqual(explore_topic._max_subtopic_sv_limit(state_zero), 1)
    self.assertIsInstance(fulfillment_base._get_max_num_charts(state_zero), int)
    self.assertGreaterEqual(fulfillment_base._get_max_num_charts(state_zero), 1)

  def test_parse_and_clamp_numeric_param(self):
    clamp = params.parse_and_clamp_numeric_param
    self.assertEqual(clamp('10', 500), 10)
    self.assertEqual(clamp(' 10.0 ', 500), 10)
    self.assertEqual(clamp(12.7, 500), 12)
    self.assertEqual(clamp(99999, 500), 500)
    for bad in (None, '', 'abc', 'nan', '1e400', 0, -5, True, [10]):
      self.assertIsNone(clamp(bad, 500), bad)

  def test_max_allowed_params_are_accepted_unchanged(self):
    # Largest values existing clients send.
    with self.app.test_request_context(
        '/api/explore/detect-and-fulfill?maxTopics=10&maxTopicSvs=500&maxCharts=200'
    ):
      from flask import request
      uttr = _make_utterance(['dc/topic/Root'])
      explore_helpers.update_insight_ctx_for_chart_fulfill(
          request, uttr, 'custom')

      self.assertEqual(uttr.insight_ctx[params.Params.MAX_TOPICS], 10)
      self.assertEqual(uttr.insight_ctx[params.Params.MAX_TOPIC_SVS], 500)
      self.assertEqual(uttr.insight_ctx[params.Params.MAX_CHARTS], 200)


class TestTopicRecursionBounds(unittest.TestCase):
  """Verifies cycle safety, depth bounds, and total SV budget during topic expansion."""

  def setUp(self):
    self.app = Flask(__name__)

  @patch('server.lib.nl.common.topic._members')
  def test_cyclic_topic_hierarchy_terminates(self, mock_members):
    # Topic A -> Topic B -> Topic A (cycle)
    graph = {
        'dc/topic/A': ['dc/topic/B', 'SV_A1'],
        'dc/topic/B': ['dc/topic/A', 'SV_B1'],
    }
    mock_members.side_effect = lambda node, prop, dc='main': graph.get(node, [])

    with self.app.app_context():
      svs = common_topic.get_topic_vars_recurive('dc/topic/A',
                                                 rank=0,
                                                 dc='custom',
                                                 max_svs=500)
      self.assertEqual(svs, ['SV_B1', 'SV_A1'])

  @patch('server.lib.nl.common.topic._members')
  def test_diamond_dag_topic_hierarchy_expands_shared_subtopic_once(
      self, mock_members):
    # Diamond DAG: A -> [B, C], and both B and C -> D
    graph = {
        'dc/topic/A': ['dc/topic/B', 'dc/topic/C'],
        'dc/topic/B': ['dc/topic/D', 'SV_B'],
        'dc/topic/C': ['dc/topic/D', 'SV_C'],
        'dc/topic/D': ['SV_D1', 'SV_D2'],
    }
    mock_members.side_effect = lambda node, prop, dc='main': graph.get(node, [])

    with self.app.app_context():
      svs = common_topic.get_topic_vars_recurive('dc/topic/A',
                                                 rank=0,
                                                 dc='custom',
                                                 max_svs=500)
      self.assertEqual(svs, ['SV_D1', 'SV_D2', 'SV_B', 'SV_C'])
      # D should only be queried once despite being reachable via both B and C.
      d_calls = [
          call for call in mock_members.call_args_list
          if call.args and call.args[0] == 'dc/topic/D'
      ]
      self.assertEqual(len(d_calls), 1)

  @patch('server.lib.nl.common.topic._members')
  def test_deep_topic_chain_stops_at_max_svs(self, mock_members):
    # 50-level topic chain, one SV per level.
    graph = {
        f'dc/topic/L{i}': [f'SV_L{i}', f'dc/topic/L{i + 1}'] for i in range(50)
    }
    mock_members.side_effect = lambda node, prop, dc='main': graph.get(node, [])

    with self.app.app_context():
      svs = common_topic.get_topic_vars_recurive('dc/topic/L0',
                                                 rank=0,
                                                 dc='custom',
                                                 max_svs=5)
      self.assertEqual(svs, [f'SV_L{i}' for i in range(6)])
      self.assertEqual(mock_members.call_count, 6)

  @patch('server.lib.nl.common.topic._members')
  def test_compute_chart_vars_bounds_total_svs_across_subtopics(
      self, mock_members):
    # Root topic with 40 immediate subtopics, each containing 50 SVs (2,000 SVs total).
    subtopics = [f'dc/topic/Sub_{i}' for i in range(40)]
    graph = {'dc/topic/Root': subtopics}
    for i, st in enumerate(subtopics):
      graph[st] = [f'SV_{i}_{j}' for j in range(50)]

    mock_members.side_effect = lambda node, prop, dc='main': graph.get(node, [])

    uttr = _make_utterance(
        ['dc/topic/Root'],
        insight_ctx={
            params.Params.DC.value: 'custom',
            params.Params.MAX_TOPICS.value: 10,
            params.Params.MAX_TOPIC_SVS.value: 500,
        },
    )
    state = PopulateState(uttr=uttr)

    with self.app.app_context():
      chart_vars_map = explore_topic.compute_chart_vars(state)
      total_svs = sum(
          len(cv.svs) for cv_list in chart_vars_map.values() for cv in cv_list)
      self.assertLessEqual(total_svs, explore_topic._MAX_SVS_TO_PROCESS)
      # Only Root + the first 10 subtopics (10 * 50 = 500 SVs) should be queried,
      # not all 40 subtopics!
      self.assertEqual(mock_members.call_count, 11)


class TestFulfillmentChartAndMemoryBounds(unittest.TestCase):
  """Verifies chart candidate count and memory are bounded during fulfillment."""

  def setUp(self):
    self.app = Flask(__name__)
    self.app.config['NOPC_VARS'] = set()

  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'sv_existence_for_places_check_single_point')
  def test_single_block_with_many_svs_is_capped(self, mock_sv_existence,
                                                mock_extend_svs):
    mock_extend_svs.return_value = {}
    # One chart block whose SVs fan out past MAX_CHART_CANDIDATES.
    many_svs = [f'SV_{i}' for i in range(params.MAX_CHART_CANDIDATES + 100)]
    mock_sv_existence.return_value = (
        {
            sv: {
                'Earth': {
                    'facetId': 'f1'
                }
            } for sv in many_svs
        },
        {
            sv: {
                'Earth': False
            } for sv in many_svs
        },
    )

    uttr = _make_utterance(['dc/topic/Large'],
                           insight_ctx={params.Params.DC.value: 'custom'})
    state = PopulateState(uttr=uttr)
    state.query_types = [QueryType.BASIC]
    state.chart_vars_map = {
        'dc/topic/Large': [
            ChartVars(svs=many_svs,
                      orig_sv_map={'dc/topic/Large': many_svs},
                      source_topic='dc/topic/Large')
        ]
    }

    with self.app.app_context():
      fulfillment_base.populate_charts(state)
      self.assertEqual(len(state.uttr.chartCandidates),
                       params.MAX_CHART_CANDIDATES)
      # Each per-SV chart should only carry its own SV in orig_sv_map.
      for cs in state.uttr.chartCandidates:
        self.assertEqual(cs.chart_vars.orig_sv_map, {'dc/topic/Large': cs.svs})
