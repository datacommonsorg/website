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
from typing import Dict, List

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
  logging.info(places_to_check)

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

  chart_pb = chart_builder.build(chart_vars_list, state, existing_svs,
                                 cb_config)
  related_things = _compute_related_things(state)

  return chart_pb, related_things


def _compute_related_things(state: ftypes.PopulateState):
  # Trim child and parent places based on existence check results.
  _trim_nonexistent_places(state)

  related_things = {
      'parentPlaces': [],
      'childPlaces': {},
      'parentTopics': [],
      'peerTopics': [],
  }

  # Convert the places to json.
  pd = state.uttr.detection.places_detected
  related_things['parentPlaces'] = _get_json_places(pd.parent_places)
  if state.place_type:
    related_things['childPlaces'] = {
        state.place_type.value: _get_json_places(pd.child_places)
    }

  # Expan to parent and peer topics.
  if state.uttr.svs:
    start = time.time()
    pt = topic.get_parent_topics(state.uttr.svs)
    related_things['parentTopics'] = pt
    pt = [p['dcid'] for p in pt]
    related_things['peerTopics'] = topic.get_child_topics(pt)
    state.uttr.counters.timeit('topic_expansion', start)

  return related_things


# Also delete non-existent child and parent places in detection!
def _trim_nonexistent_places(state: ftypes.PopulateState):
  detection = state.uttr.detection.places_detected

  # Existing placekeys
  exist_placekeys = set()
  for _, plmap in state.exist_checks.items():
    exist_placekeys.update(plmap.keys())

  # For child places, use a specific key:
  if detection.child_places:
    key = state.uttr.places[0].dcid + state.place_type.value
    if key not in exist_placekeys:
      detection.child_places = []

  exist_parents = []
  for p in detection.parent_places:
    if p.dcid in exist_placekeys:
      exist_parents.append(p)
  detection.parent_places = exist_parents


def _get_json_places(places: List[dtypes.Place]) -> List[Dict]:
  # Helper to strip out suffixes.
  def _trim(l):
    r = []
    for s in [' County']:
      for p in l:
        if 'name' in p:
          p['name'] = p['name'].removesuffix(s)
        r.append(p)
    return r

  res = []
  for p in places:
    res.append({'dcid': p.dcid, 'name': p.name, 'types': [p.place_type]})
  return _trim(res)


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
