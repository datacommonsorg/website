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

# Module for Explore fulfillment

from dataclasses import dataclass
import time
from typing import Dict, List, Set

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.explore import existence
from server.lib.explore import page_main
from server.lib.explore import page_sdg
import server.lib.explore.extension as extension
from server.lib.explore.params import is_sdg
from server.lib.explore.params import Params
import server.lib.explore.related as related
import server.lib.explore.topic as topic
import server.lib.nl.common.utils as cutils
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.config_builder import builder
import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.context as ctx
import server.lib.nl.fulfillment.existence as ext
import server.lib.nl.fulfillment.types as ftypes


@dataclass
class FulfillResp:
  chart_pb: SubjectPageConfig
  related_things: Dict
  user_message: str


#
# Populate chart candidates in the utterance.
#
def fulfill(uttr: nl_uttr.Utterance, cb_config: builder.Config) -> FulfillResp:
  # This is a useful thing to set since checks for
  # single-point or not happen downstream.
  uttr.query_type = nl_uttr.QueryType.SIMPLE
  pt = cutils.get_contained_in_type(uttr)
  state = ftypes.PopulateState(uttr=uttr, main_cb=None, place_type=pt)

  # Open up topics into vars and build ChartVars for each.

  has_correlation = ctx.classifications_of_type_from_utterance(
      uttr, dtypes.ClassificationType.CORRELATION)

  chart_vars_map = {}
  if has_correlation and state.uttr.multi_svs:
    chart_vars_map = topic.compute_correlation_chart_vars(state)
  else:
    chart_vars_map = topic.compute_chart_vars(state)

  # Get places to perform existence check on.
  places_to_check = {}
  for p in _get_place_dcids(uttr.places):
    places_to_check[p] = p
  if state.place_type:
    # Add child places
    key = uttr.places[0].dcid + state.place_type.value
    for p in uttr.detection.places_detected.child_places[:cutils.
                                                         NUM_CHILD_PLACES_FOR_EXISTENCE]:
      places_to_check[p.dcid] = key
  for p in uttr.detection.places_detected.parent_places:
    places_to_check[p.dcid] = p.dcid

  if not places_to_check:
    uttr.counters.err("failed_NoPlacesToCheck", '')
    return None, {}

  start = time.time()
  # Perform existence checks for all the SVs!
  tracker = ext.MainExistenceCheckTracker(state,
                                          places_to_check,
                                          uttr.svs,
                                          prep_chart_vars=False,
                                          sv2chartvarslist=chart_vars_map)
  tracker.perform_existence_check()
  state.uttr.counters.timeit('main_existence_check', start)

  # Given a tracker, updates these structures.
  existing_svs = set(state.uttr.svs)
  chart_vars_list = []
  topics = []
  explore_more_svs = set()
  _chart_vars_fetch(tracker, chart_vars_list, existing_svs, topics,
                    explore_more_svs)

  explore_peer_groups = {}

  # Route to an appropriate page generator.
  if is_sdg(state.uttr.insight_ctx):
    config_resp = page_sdg.build_config(chart_vars_list, state, existing_svs,
                                        cb_config)
  else:
    ext_chart_vars_list = []

    # Get extensions chart-vars by doing API calls.
    override_expansion_svgs = state.uttr.insight_ctx.get(Params.EXT_SVGS, [])
    # Check if we need extension based on the number of charts & SVs.
    if (topics and
        (override_expansion_svgs or
         extension.needs_extension(len(chart_vars_list), len(existing_svs)))):
      start = time.time()
      ext_chart_vars_map = extension.extend_topics(topics, existing_svs,
                                                   override_expansion_svgs)
      state.uttr.counters.timeit('extend_topics', start)

      if ext_chart_vars_map:
        # Perform existence check and add to `chart_vars_list`
        start = time.time()
        ext_tracker = ext.MainExistenceCheckTracker(
            state,
            places_to_check,
            svs=list(ext_chart_vars_map.keys()),
            prep_chart_vars=False,
            sv2chartvarslist=ext_chart_vars_map)
        ext_tracker.perform_existence_check()
        state.uttr.counters.timeit('extension_existence_check', start)
        _chart_vars_fetch(ext_tracker, ext_chart_vars_list, existing_svs)

    if state.uttr.insight_ctx.get(Params.EXP_MORE):
      explore_more_chart_vars_map = extension.explore_more(
          list(explore_more_svs))
      if explore_more_chart_vars_map:
        # Perform existence check and add to `chart_vars_list`
        start = time.time()
        ext_tracker = ext.MainExistenceCheckTracker(
            state,
            places_to_check,
            svs=list(explore_more_chart_vars_map.keys()),
            prep_chart_vars=False,
            sv2chartvarslist=explore_more_chart_vars_map)
        ext_tracker.perform_existence_check()
        state.uttr.counters.timeit('explore_more_existence_check', start)

      explore_peer_groups = _chart_vars_to_explore_peer_groups(
          state, explore_more_chart_vars_map)

    config_resp = page_main.build_config(chart_vars_list, ext_chart_vars_list,
                                         state, existing_svs, cb_config)

  related_things = related.compute_related_things(state,
                                                  config_resp.plotted_orig_vars,
                                                  explore_peer_groups)

  return FulfillResp(chart_pb=config_resp.config_pb,
                     related_things=related_things,
                     user_message=config_resp.user_message)


def _get_place_dcids(places: List[dtypes.Place]) -> List[str]:
  dcids = []
  for p in places:
    dcids.append(p.dcid)
  return dcids


def _chart_vars_fetch(tracker: ext.MainExistenceCheckTracker,
                      chart_vars_list: List[ftypes.ChartVars],
                      existing_svs: Set[str],
                      topics: List[str] = None,
                      explore_more_svs: Set[str] = None):
  for exist_state in tracker.exist_sv_states:
    for exist_cv in exist_state.chart_vars_list:
      cv = tracker.get_chart_vars(exist_cv)
      if cv.svs:
        existing_svs.update(cv.svs)
        chart_vars_list.append(cv)
        if explore_more_svs != None and len(explore_more_svs) < 20:
          # Typically, only the first few SVs are shown
          # at the top of the page, so restrict to 4.
          explore_more_svs.update(cv.svs[:10])
      if cv.source_topic:
        existing_svs.add(cv.source_topic)
      if cv.svpg_id:
        existing_svs.add(cv.svpg_id)
      if cv.orig_sv:
        existing_svs.add(cv.orig_sv)
        if topics != None and cutils.is_topic(
            cv.orig_sv) and cv.orig_sv not in topics:
          topics.append(cv.orig_sv)


def _chart_vars_to_explore_peer_groups(state: ftypes.PopulateState,
                                       explore_more_chart_vars_map) -> Dict:
  explore_peer_groups = {}

  for sv, cv_list in explore_more_chart_vars_map.items():
    if not existence.svs4place(state, state.uttr.places[0], [sv]).exist_svs:
      continue
    for cv in cv_list:
      er = existence.svs4place(state, state.uttr.places[0], cv.svs)
      if len(er.exist_svs) < 2:
        continue
      if sv not in explore_peer_groups:
        explore_peer_groups[sv] = {}
      if cv.source_topic not in explore_peer_groups[sv]:
        explore_peer_groups[sv][cv.source_topic] = sorted(er.exist_svs)

  return explore_peer_groups
