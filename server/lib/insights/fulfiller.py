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

import time
from typing import List

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.insights import page
import server.lib.insights.related as related
import server.lib.insights.topic as topic
import server.lib.nl.common.utils as cutils
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.config_builder import builder
import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.existence as ext
import server.lib.nl.fulfillment.types as ftypes


#
# Populate chart candidates in the utterance.
#
def fulfill(uttr: nl_uttr.Utterance,
            cb_config: builder.Config) -> SubjectPageConfig:
  # This is a useful thing to set since checks for
  # single-point or not happen downstream.
  uttr.query_type = nl_uttr.QueryType.SIMPLE
  pt = cutils.get_contained_in_type(uttr)
  state = ftypes.PopulateState(uttr=uttr, main_cb=None, place_type=pt)

  # Open up topics into vars and build ChartVars for each.
  chart_vars_map = {}
  for sv in state.uttr.svs:
    cv = []
    if cutils.is_sv(sv):
      cv = [ftypes.ChartVars(svs=[sv])]
    else:
      start = time.time()
      cv = topic.compute_chart_vars(state, sv)
      state.uttr.counters.timeit('topic_calls', start)
    if cv:
      chart_vars_map[sv] = cv

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
      if chart_vars.source_topic:
        existing_svs.add(chart_vars.source_topic)
      if chart_vars.svpg_id:
        existing_svs.add(chart_vars.svpg_id)

  chart_pb = page.build_config(chart_vars_list, state, existing_svs, cb_config)
  related_things = related.compute_related_things(state)

  return chart_pb, related_things


def _get_place_dcids(places: List[dtypes.Place]) -> List[str]:
  dcids = []
  for p in places:
    dcids.append(p.dcid)
  return dcids
