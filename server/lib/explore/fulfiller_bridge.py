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

# NL Bridge fulfiller.

import copy
import time
from typing import cast, Dict, List

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.explore import extension
from server.lib.explore import params
from server.lib.explore import related
import server.lib.explore.fulfiller as exp_fulfiller
import server.lib.explore.related as related
from server.lib.nl.common import utils
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.config_builder import base
import server.lib.nl.config_builder.builder as nl_config_builder
from server.lib.nl.fulfillment import existence
import server.lib.nl.fulfillment.fulfiller as nl_fulfiller
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState


def fulfill(uttr: nl_uttr.Utterance,
            cb_config: base.Config) -> exp_fulfiller.FulfillResp:
  state = nl_fulfiller.fulfill(uttr, explore_mode=True)

  config_pb = nl_config_builder.build(state, cb_config)

  plotted_orig_vars = _get_plotted_orig_vars(state)

  explore_peer_groups = {}
  if not state.uttr.insight_ctx.get(params.Params.EXP_MORE_DISABLED):
    explore_more_chart_vars_map = _get_explore_more_chart_vars(state)
    explore_peer_groups = extension.chart_vars_to_explore_peer_groups(
        state, explore_more_chart_vars_map)

  related_things = related.compute_related_things(state, plotted_orig_vars,
                                                  explore_peer_groups)

  return exp_fulfiller.FulfillResp(chart_pb=config_pb,
                                   related_things=related_things)


def _get_plotted_orig_vars(
    state: PopulateState) -> List[related.PlottedOrigVar]:
  plotted_orig_vars: List[related.PlottedOrigVar] = []

  def _node(sv):
    name = state.sv2thing.name.get(sv, '')
    if utils.is_topic(sv):
      typ = 'Topic'
    else:
      typ = 'StatisticalVariable'
    return related.Node(types=[typ], name=name, dcid=sv)

  added = set()
  for cs in state.uttr.rankedCharts:
    cs = cast(ChartSpec, cs)
    svs = cs.chart_vars.orig_svs
    if not svs:
      continue
    svk = ''.join(sorted(svs))
    if svk in added:
      continue
    plotted_orig_vars.append(
        related.PlottedOrigVar(svs=[_node(sv) for sv in svs]))
    added.add(svk)

  return plotted_orig_vars


def _get_explore_more_chart_vars(
    state: PopulateState) -> Dict[str, List[ChartVars]]:
  # Get up to 10 SVs from each chart.
  explore_more_svs = set()
  for cs in state.uttr.rankedCharts:
    cs = cast(ChartSpec, cs)
    if cs.chart_vars.svs:
      explore_more_svs.update(cs.chart_vars.svs[:10])

  start = time.time()
  explore_more_chart_vars_map = extension.explore_more(list(explore_more_svs))
  state.uttr.counters.timeit('explore_more_sv_extensions', start)

  if explore_more_chart_vars_map:
    # Perform existence check and add to `chart_vars_list`
    start = time.time()
    ext_tracker = existence.MainExistenceCheckTracker(
        state,
        state.places_to_check,
        sv2chartvarslist=explore_more_chart_vars_map)
    ext_tracker.perform_existence_check()
    state.uttr.counters.timeit('explore_more_existence_check', start)

  return explore_more_chart_vars_map
