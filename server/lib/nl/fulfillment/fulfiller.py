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

import logging
from typing import cast, Dict, List

from flask import current_app

from server.lib.explore import params
from server.lib.explore import related
import server.lib.explore.topic as topic
from server.lib.nl.common import utils
from server.lib.nl.common import variable
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
import server.lib.nl.detection.types as dtypes
from server.lib.nl.fulfillment import base
from server.lib.nl.fulfillment import event
from server.lib.nl.fulfillment import filter_with_dual_vars
from server.lib.nl.fulfillment import overview
from server.lib.nl.fulfillment import size_across_entities
import server.lib.nl.fulfillment.handlers as handlers
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import PopulateState
import server.lib.nl.fulfillment.utils as futils


#
# Populate chart candidates in the utterance.
#
def fulfill(uttr: Utterance,
            explore_mode: bool = False,
            related_things: Dict = {}) -> Utterance:
  # Construct a common PopulateState
  state = PopulateState(uttr=uttr)

  # IMPORTANT: Do this as the very first thing before
  # accessing the various heuristics, since it may
  # update `uttr`
  state.query_types = _produce_query_types(uttr)

  state.place_type = utils.get_contained_in_type(uttr)
  state.ranking_types = utils.get_ranking_types(uttr)
  state.time_delta_types = utils.get_time_delta_types(uttr)
  state.quantity = utils.get_quantity(uttr)
  state.event_types = utils.get_event_types(uttr)
  state.explore_mode = explore_mode

  if not state.query_types:
    uttr.counters.err('fulfill_empty_querytypes', '')
    return uttr

  main_qt = state.query_types[0]

  # TODO: Avoid relying on a single query_type

  state.uttr.query_type = main_qt
  # Perform certain type-specific overrides or actions.
  done = False
  if main_qt == QueryType.FILTER_WITH_DUAL_VARS:
    # This needs custom SVs.
    filter_with_dual_vars.set_overrides(state)
  elif main_qt == QueryType.SIZE_ACROSS_ENTITIES:
    # This needs custom SVs.
    size_across_entities.set_overrides(state)
  elif main_qt == QueryType.OVERVIEW:
    done = overview.populate(uttr)
  elif main_qt == QueryType.EVENT:
    # TODO: Port `event` to work in the normal flow.
    # TODO: Don't consider it "done", try showing SVs too.
    done = event.populate(uttr)
    state.query_types.remove(QueryType.EVENT)

  elif main_qt == QueryType.COMPARISON_ACROSS_PLACES:
    # There are multiple places so we don't fallback.
    state.disable_fallback = True

  if done:
    _rank_charts(uttr)
    return uttr

  # Compute all the ChartVars
  has_correlation = futils.classifications_of_type_from_utterance(
      uttr, dtypes.ClassificationType.CORRELATION)
  if has_correlation and state.uttr.multi_svs:
    state.chart_vars_map = topic.compute_correlation_chart_vars(state)
  else:
    state.chart_vars_map = topic.compute_chart_vars(state)

  # Call populate_charts.
  if not base.populate_charts(state):
    # If that failed, try OVERVIEW.
    state.uttr.query_type = QueryType.OVERVIEW
    overview.populate(uttr)

  # Rank candidates.
  _rank_charts(state.uttr)

  if explore_mode:
    plotted_orig_vars = _get_plotted_orig_vars(uttr)
    related_things.update(
        related.compute_related_things(state, plotted_orig_vars, {}))

  return state.uttr


def _produce_query_types(uttr: Utterance) -> List[QueryType]:
  query_types = [handlers.first_query_type(uttr)]
  while query_types[-1] != None:
    query_types.append(handlers.next_query_type(query_types))
  return query_types


#
# Rank candidate charts in the given Utterance.
#
# TODO: Maybe improve in future.
def _rank_charts(utterance: Utterance):
  for chart in utterance.chartCandidates:
    logging.info("Chart: %s %s\n" % (chart.places, chart.svs))
  utterance.rankedCharts = utterance.chartCandidates


# TODO: Improve this
def _get_plotted_orig_vars(uttr: Utterance) -> List[Dict]:
  sv_chart_titles = current_app.config['NL_CHART_TITLES']
  dc = uttr.insight_ctx.get(params.Params.DC.value,
                            params.DCNames.MAIN_DC.value)

  plotted_orig_vars: List[Dict] = []
  added = set()
  for cs in uttr.rankedCharts:
    cs = cast(ChartSpec, cs)
    sv = cs.chart_vars.orig_sv
    if sv and sv not in added:
      if utils.is_topic(sv):
        typ = 'Topic'
        # Topics use the topic-cache so should be fast.
        # TODO: Consider getting this from `sv2thing` in a later stage.
        name = variable.get_sv_name([sv], sv_chart_titles, dc)[sv]
      else:
        typ = 'StatisticalVariable'
        name = sv
      plotted_orig_vars.append({'types': [typ], 'name': name, 'dcid': sv})
      added.add(sv)

  return plotted_orig_vars
