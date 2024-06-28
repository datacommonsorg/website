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
"""Module for NL page data spec"""

import copy
from typing import cast, Dict, List

from flask import current_app

from server.lib.nl.common import utils
from server.lib.nl.common.utterance import FulfillmentResult
from server.lib.nl.common.utterance import QueryMode
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
import server.lib.nl.detection.types as dtypes
import server.lib.nl.explore.params as params
import server.lib.nl.explore.topic as topic
from server.lib.nl.fulfillment import base
from server.lib.nl.fulfillment import event
from server.lib.nl.fulfillment import filter_with_dual_vars
from server.lib.nl.fulfillment import overview
from server.lib.nl.fulfillment import superlative
from server.lib.nl.fulfillment import triple
import server.lib.nl.fulfillment.handlers as handlers
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
import server.lib.nl.fulfillment.utils as futils

_TOPIC_PREFIX = "dc/topic/"


#
# Populate chart candidates in the utterance.
#
def fulfill(uttr: Utterance) -> PopulateState:
  # Construct a common PopulateState
  state = PopulateState(uttr=uttr)

  if not _perform_classification_checks(uttr):
    return state

  # IMPORTANT: Do this as the very first thing before
  # accessing the various heuristics, since it may
  # update `uttr`
  state.query_types = _produce_query_types(uttr)

  pt_cls = futils.classifications_of_type(
      uttr.classifications, dtypes.ClassificationType.CONTAINED_IN)
  if pt_cls:
    cip = cast(dtypes.ContainedInClassificationAttributes, pt_cls[0].attributes)
    state.place_type = cip.contained_in_place_type
    state.had_default_place_type = cip.had_default_type
  state.ranking_types = utils.get_ranking_types(uttr)
  state.time_delta_types = utils.get_time_delta_types(uttr)
  state.quantity = utils.get_quantity(uttr)
  state.event_types = utils.get_event_types(uttr)
  state.single_date = utils.get_single_date(uttr)
  # Only one of single date or date range should be specified, so only get date
  # range if there is no single date.
  if not state.single_date:
    state.date_range = utils.get_date_range(uttr)

  if not state.query_types:
    uttr.counters.err('fulfill_empty_querytypes', '')
    return state

  main_qt = state.query_types[0]

  # Perform certain type-specific overrides or actions.
  done = False
  while True:
    success = True
    state.uttr.query_type = main_qt
    if main_qt == QueryType.FILTER_WITH_DUAL_VARS:
      # This needs custom SVs.
      success = filter_with_dual_vars.set_overrides(state)
    elif main_qt == QueryType.SUPERLATIVE:
      # This needs custom SVs.
      success = superlative.set_overrides(state)
    elif main_qt == QueryType.OVERVIEW:
      done = overview.populate(uttr)
    elif main_qt == QueryType.EVENT:
      # TODO: Port `event` to work in the normal flow.
      # Don't consider it done or failed, and fallthrough to show SV stuff
      event.populate(uttr)
      state.query_types.remove(QueryType.EVENT)
    elif main_qt == QueryType.COMPARISON_ACROSS_PLACES:
      # There are multiple places so we don't fallback.
      state.disable_fallback = True
    elif main_qt == QueryType.TRIPLE:
      # We currently only want one of triple or regular charts, so consider the
      # fulfillment to be done if triple is successful. This assumes preference
      # for triples fulfillment.
      # TODO: decide to fulfill as a triple vs fulfill as a regular sv depending
      # on the variable score match.
      done = triple.populate(state)

    # All done if successful
    if success:
      break

    state.query_types.remove(main_qt)
    if not state.query_types:
      uttr.counters.err('fulfill_empty_querytypes', '')
      return state

    # Try the next query_type
    main_qt = state.query_types[0]

  if done:
    _rank_charts(uttr)
    return state

  # Compute all the ChartVars
  has_correlation = main_qt == QueryType.CORRELATION_ACROSS_VARS
  if (has_correlation and state.uttr.multi_svs and
      state.uttr.multi_svs.candidates):
    state.chart_vars_map = topic.compute_correlation_chart_vars(state)
    if not state.chart_vars_map:
      state.chart_vars_map = topic.compute_chart_vars(state)
  else:
    state.chart_vars_map = topic.compute_chart_vars(state)
    # only do toolformer rig updates in single sv case
    if state.uttr.mode == QueryMode.TOOLFORMER_RIG:
      _update_chart_vars_for_rig(state)

  if params.is_special_dc(state.uttr.insight_ctx):
    _prune_non_country_special_dc_vars(state)

  # No fallback for toolformer mode!
  if params.is_toolformer_mode(state.uttr.mode):
    state.disable_fallback = True

  # Call populate_charts.
  if not base.populate_charts(state):
    # If that failed, try OVERVIEW.
    state.uttr.query_type = QueryType.OVERVIEW
    overview.populate(uttr)

  # Rank candidates.
  _rank_charts(state.uttr)

  # Prevent artificial overwritten SVs from propagating into
  # the context of next query.  This is relevant for two types:
  # - superlatives
  # - dual-var filter query
  if state.has_overwritten_svs:
    state.uttr.svs = []
    state.uttr.sv_source = FulfillmentResult.UNKNOWN

  return state


# Returns False if the checks fail (aka should not proceed).
def _perform_classification_checks(uttr: Utterance) -> bool:
  detailed_action = utils.get_action_verbs(uttr)
  if detailed_action:
    uttr.counters.info('fulfill_detailed_action_querytypes', detailed_action)
    return False

  if futils.classifications_of_type(uttr.classifications,
                                    dtypes.ClassificationType.TEMPORAL):
    uttr.counters.info('fulfill_temporal_types_detected', [])
    return False

  return True


def _produce_query_types(uttr: Utterance) -> List[QueryType]:
  query_types = []
  # Add triple query type even when there are no properties if there's no place
  # detected because assume the user is specifically asking about the entity
  if params.is_bio(uttr.insight_ctx) and uttr.entities and (uttr.properties or
                                                            not uttr.places):
    query_types.append(QueryType.TRIPLE)
  # The remaining query types require places to be set
  if not uttr.places:
    return query_types

  query_types.append(handlers.first_query_type(uttr))
  while query_types[-1] != None:
    query_types.append(handlers.next_query_type(query_types))

  return query_types


#
# Rank candidate charts in the given Utterance.
#
# TODO: Maybe improve in future.
def _rank_charts(utterance: Utterance):
  utterance.rankedCharts = utterance.chartCandidates


def _prune_non_country_special_dc_vars(state: PopulateState):
  places = state.uttr.places
  if not places or all([p.place_type != 'Country' for p in places]):
    # The main places are not countries, nothing to do.
    return

  if not current_app.config.get('SPECIAL_DC_NON_COUNTRY_ONLY_VARS'):
    state.uttr.counters.err('failed_missing_special_dc_noncountry_vars', '')
    return
  sdc_non_country_vars = current_app.config['SPECIAL_DC_NON_COUNTRY_ONLY_VARS']

  # Go over the chart_vars_map and drop
  pruned_chart_vars_map = {}
  dropped_vars = set()
  for var, chart_vars_list in state.chart_vars_map.items():
    if var in sdc_non_country_vars:
      dropped_vars.add(var)
      continue
    pruned_chart_vars_list = []
    for cv in chart_vars_list:
      pruned_cv = copy.deepcopy(cv)
      pruned_cv.svs = []
      for v in cv.svs:
        if v in sdc_non_country_vars:
          dropped_vars.add(v)
          continue
        pruned_cv.svs.append(v)
      if pruned_cv.svs:
        pruned_chart_vars_list.append(pruned_cv)
    if pruned_chart_vars_list:
      pruned_chart_vars_map[var] = pruned_chart_vars_list

  if dropped_vars:
    state.uttr.counters.info('info_sdg_noncountry_vars_dropped',
                             list(dropped_vars))

  state.chart_vars_map = pruned_chart_vars_map


#
# Update chart vars map for toolformer rig mode because needs special handling
# of topics where we only want the stat vars that match both the topic and the
# actual query.
#
def _update_chart_vars_for_rig(state: PopulateState):
  # set of all svs that are part of a topic
  topic_svs = set()
  for var, chart_vars_list in state.chart_vars_map.items():
    if not var.startswith(_TOPIC_PREFIX):
      continue
    for cv in chart_vars_list:
      topic_svs.update(cv.svs)

  updated_chart_vars_map: Dict[str, List[ChartVars]] = {}

  # remove topic chart vars
  dropped_topics = set()
  for var, chart_vars_list in state.chart_vars_map.items():
    if var.startswith(_TOPIC_PREFIX):
      dropped_topics.add(var)
      continue
    updated_chart_vars_map[var] = chart_vars_list

  # add chart vars for detected svs with a score above model threshold & part
  # of a topic that was in the original chart vars
  added_svs = set()
  detected_single_sv = state.uttr.detection.svs_detected.single_sv
  for sv, score in zip(detected_single_sv.svs, detected_single_sv.scores):
    # skip topic svs
    if sv.startswith(_TOPIC_PREFIX):
      continue
    # skip if score is below default threshold
    if score < state.uttr.detection.svs_detected.model_threshold:
      continue
    # skip if not part of a topic that was detected
    if not sv in topic_svs:
      continue
    # skip if sv is already in the chart vars map
    if sv in updated_chart_vars_map:
      continue
    updated_chart_vars_map[sv] = [ChartVars(svs=[sv], orig_sv_map={sv: [sv]})]
    added_svs.add(sv)

  if dropped_topics:
    state.uttr.counters.info('info_toolformer_rig_topic_vars_dropped',
                             list(dropped_topics))
  if added_svs:
    state.uttr.counters.info('info_toolformer_rig_sv_vars_added',
                             list(added_svs))

  state.chart_vars_map = updated_chart_vars_map
