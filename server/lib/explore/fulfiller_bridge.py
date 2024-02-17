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

from dataclasses import dataclass
import time
from typing import cast, Dict, List

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.explore import extension
from server.lib.explore import params
from server.lib.explore import related
import server.lib.explore.related as related
from server.lib.nl.common import constants
from server.lib.nl.common import utils
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.config_builder import base
import server.lib.nl.config_builder.builder as nl_config_builder
from server.lib.nl.fulfillment import existence
import server.lib.nl.fulfillment.fulfiller as nl_fulfiller
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartType
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState


@dataclass
class FulfillResp:
  chart_pb: SubjectPageConfig
  related_things: Dict
  user_message: str


def fulfill(uttr: nl_uttr.Utterance, cb_config: base.Config) -> FulfillResp:
  state = nl_fulfiller.fulfill(uttr, explore_mode=True)

  builder_result = nl_config_builder.build(state, cb_config)
  if not builder_result.page_config:
    return FulfillResp(chart_pb=None,
                       related_things={},
                       user_message=builder_result.page_msg)

  if uttr.mode == params.QueryMode.STRICT:
    # No related things for strict mode.
    return FulfillResp(chart_pb=builder_result.page_config,
                       related_things={},
                       user_message=builder_result.page_msg)

  plotted_orig_vars = _get_plotted_orig_vars(state)

  explore_peer_groups = {}
  if (not state.uttr.insight_ctx.get(params.Params.EXP_MORE_DISABLED) and
      not params.is_special_dc(state.uttr.insight_ctx)):
    explore_more_chart_vars_map = _get_explore_more_chart_vars(state)
    explore_peer_groups = extension.chart_vars_to_explore_peer_groups(
        state, explore_more_chart_vars_map)

  related_things = related.compute_related_things(state, plotted_orig_vars,
                                                  explore_peer_groups)

  return FulfillResp(chart_pb=builder_result.page_config,
                     related_things=related_things,
                     user_message=builder_result.page_msg)


def _get_plotted_orig_vars(
    state: PopulateState) -> List[related.PlottedOrigVar]:

  if _is_place_overview(state.uttr.rankedCharts):
    return [
        related.PlottedOrigVar(svs=[
            related.Node(
                dcid=constants.ROOT_TOPIC, name='Statistics', types=['Topic'])
        ])
    ]

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
    osv2svs = cs.chart_vars.orig_sv_map
    if not osv2svs:
      continue

    orig_svs = list(osv2svs.keys())
    if len(osv2svs) == 2 and len(cs.svs) != 2:
      # This was intended as a correlation query, but we're not plotting
      # a 2-SV chart.  So only add the specific orig SV that we're
      # plotting in the chart.
      if len(cs.svs) > 1:
        continue
      for orig, svs in osv2svs.items():
        if cs.svs[0] in svs:
          orig_svs = [orig]
          break

    svk = ''.join(sorted(orig_svs))
    if svk in added:
      continue
    plotted_orig_vars.append(
        related.PlottedOrigVar(svs=[_node(sv) for sv in orig_svs]))
    added.add(svk)

  return plotted_orig_vars


def _is_place_overview(ranked_charts: List[ChartSpec]) -> bool:
  return ranked_charts and len(ranked_charts) == 1 and ranked_charts[
      0].chart_type == ChartType.PLACE_OVERVIEW


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
