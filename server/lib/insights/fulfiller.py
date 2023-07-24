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
"""Module for Insights fulfillment"""

import logging
import time
from typing import List

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.insights import chart_builder
import server.lib.nl.common.topic as topic
import server.lib.nl.common.utils as cutils
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.config_builder import builder
import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.existence as ext
import server.lib.nl.fulfillment.types as ftypes


#
# Populate chart candidates in the utterance.
#
def fulfill_chart_config(uttr: nl_uttr.Utterance,
                         cb_config: builder.Config) -> SubjectPageConfig:
  # This is a useful thing to set since checks for
  # single-point or not happen downstream.
  uttr.query_type = nl_uttr.QueryType.SIMPLE
  pt = cutils.get_contained_in_type(uttr)
  state = ftypes.PopulateState(uttr=uttr, main_cb=None, place_type=pt)

  # Open up topics into vars and build ChartVars for each.
  chart_vars_map = {}
  for sv in state.uttr.svs:
    cv = _build_chart_vars(state, sv)
    chart_vars_map[sv] = cv
    logging.info(f'{sv} -> {cv}')

  # Get places to perform existence check on.
  places_to_check = _get_place_dcids(uttr.places)
  if state.place_type:
    # REQUIRES: len(places) == 1
    places_to_check.extend(
        cutils.get_sample_child_places(uttr.places[0].dcid,
                                       state.place_type.value,
                                       state.uttr.counters))
  if not places_to_check:
    uttr.counters.err("failed_NoPlacesToCheck", '')
    return

  # Perform existence checks for all the SVs!
  # TODO: Improve existence checks to handle distinction between main-place
  # and child place.
  tracker = ext.MainExistenceCheckTracker(state, places_to_check, uttr.svs,
                                          chart_vars_map)
  tracker.perform_existence_check()

  existing_svs = set(state.uttr.svs)
  chart_vars_list = []
  for exist_state in tracker.exist_sv_states:
    for exist_cv in exist_state.chart_vars_list:
      chart_vars = tracker.get_chart_vars(exist_cv)
      if chart_vars.svs:
        existing_svs.update(chart_vars.svs)
        chart_vars_list.append(chart_vars)

  return chart_builder.build(chart_vars_list, state, existing_svs, cb_config)


def _build_chart_vars(state: ftypes.PopulateState,
                      sv: str) -> List[ftypes.ChartVars]:
  if cutils.is_sv(sv):
    return [ftypes.ChartVars(svs=[sv], insight_type=ftypes.InsightType.BLOCK)]
  if cutils.is_topic(sv):
    start = time.time()
    topic_vars = topic.get_topic_vars(sv)
    peer_groups = topic.get_topic_peergroups(topic_vars)

    # Classify into two lists.
    just_svs = []
    svpgs = []
    for v in topic_vars:
      if v in peer_groups and peer_groups[v]:
        title = topic.svpg_name(v)
        description = topic.svpg_description(v)
        svpgs.append((title, description, peer_groups[v]))
      else:
        just_svs.append(v)
    state.uttr.counters.timeit('topic_calls', start)

    # Group into blocks carefully:

    # 1. Make a block for all SVs in just_svs
    charts = [
        ftypes.ChartVars(svs=just_svs,
                         source_topic=sv,
                         insight_type=ftypes.InsightType.CATEGORY,
                         title='Overview')
    ]

    # 2. Make a block for every peer-group in svpgs
    for (title, description, svs) in svpgs:
      charts.append(
          ftypes.ChartVars(svs=svs,
                           include_percapita=False,
                           title=title,
                           description=description,
                           insight_type=ftypes.InsightType.CATEGORY,
                           is_topic_peer_group=True,
                           source_topic=sv))

    state.uttr.counters.info('topics_processed',
                             {sv: {
                                 'svs': just_svs,
                                 'peer_groups': svpgs,
                             }})
    return charts

  return []


def _get_place_dcids(places: List[dtypes.Place]) -> List[str]:
  dcids = []
  for p in places:
    dcids.append(p.dcid)
  return dcids
