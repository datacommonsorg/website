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
from typing import Dict, List

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.explore import page
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

  # Perform existence checks for all the SVs!
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
      if chart_vars.orig_sv:
        existing_svs.add(chart_vars.orig_sv)

  config_resp = page.build_config(chart_vars_list, state, existing_svs,
                                  cb_config)
  related_things = related.compute_related_things(state,
                                                  config_resp.plotted_orig_vars)

  return FulfillResp(chart_pb=config_resp.config_pb,
                     related_things=related_things,
                     user_message=config_resp.user_message)


def _get_place_dcids(places: List[dtypes.Place]) -> List[str]:
  dcids = []
  for p in places:
    dcids.append(p.dcid)
  return dcids
