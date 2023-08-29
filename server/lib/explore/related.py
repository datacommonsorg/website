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
"""Module for related things."""

from dataclasses import dataclass
import time
from typing import Dict, List

from server.lib.explore.params import DCNames
from server.lib.explore.params import Params
import server.lib.nl.common.topic as topic
import server.lib.nl.common.utils as utils
import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.types as ftypes


@dataclass
class Node:
  dcid: str
  name: str
  types: List[str]


@dataclass
class PlottedOrigVar:
  svs: List[Node]


def compute_related_things(state: ftypes.PopulateState,
                           plotted_orig_vars: List[PlottedOrigVar],
                           explore_peer_groups: Dict[str, Dict[str,
                                                               List[str]]]):
  # Trim child and parent places based on existence check results.
  _trim_nonexistent_places(state)

  related_things = {
      'parentPlaces': [],
      'childPlaces': {},
      'peerPlaces': [],
      'parentTopics': [],
      'peerTopics': [],
      'childTopics': [],
      'mainTopics': [],
      'exploreMore': explore_peer_groups,
  }

  # Convert the places to json.
  pd = state.uttr.detection.places_detected
  related_things['parentPlaces'] = _get_json_places(pd.parent_places)
  if state.place_type and pd.child_places:
    related_things['childPlaces'] = {
        state.place_type.value: _get_json_places(pd.child_places)
    }
  if pd.peer_places:
    related_things['peerPlaces'] = _get_json_places(pd.peer_places)

  dc = state.uttr.insight_ctx.get(Params.DC.value, DCNames.MAIN_DC.value)

  # Expand to parent and peer topics.
  # Do this only for one topic, otherwise it gets
  # weird to show multiple sets of parents / peers, but we need
  # to walk the list to pick topics.
  start = time.time()
  checked_orig_vars = set()
  for orig_var in plotted_orig_vars:
    svs = [v.dcid for v in orig_var.svs]
    svk = ''.join(sorted(svs))
    if svk in checked_orig_vars:
      continue
    checked_orig_vars.add(svk)
    found = False
    for n in orig_var.svs:
      t = _node_to_topic_dict(n, dc)
      if t:
        found |= True
        _add_topic_to_related(t, related_things, dc)
    if found:
      # We found a topic, so break!
      break

  if dc != "sdg":
    related_things = prune_related_topics(related_things, state.uttr)

  state.uttr.counters.timeit('topic_expansion', start)

  _trim_dups(related_things)
  return related_things


def _trim_dups(related_things: Dict):
  added = set()
  # Order is important here.
  for k in [
      'parentPlaces', 'peerPlaces', 'mainTopics', 'parentTopics', 'peerTopics',
      'childTopics'
  ]:
    k_list = []
    for it in related_things.get(k, []):
      if it['dcid'] in added:
        continue
      added.add(it['dcid'])
      k_list.append(it)
    related_things[k] = k_list


def prune_related_topics(related_things, uttr):
  # Check the data existence for related topics
  all_topics = list(
      set(([x['dcid'] for x in related_things['parentTopics']] +
           [x['dcid'] for x in related_things['peerTopics']] +
           [x['dcid'] for x in related_things['childTopics']])))

  valid_topics, _ = utils.sv_existence_for_places([x.dcid for x in uttr.places],
                                                  all_topics, uttr.counters)
  valid_topics_set = set(valid_topics)
  related_things['parentTopics'] = [
      t for t in related_things['parentTopics'] if t['dcid'] in valid_topics_set
  ]
  related_things['peerTopics'] = [
      t for t in related_things['peerTopics'] if t['dcid'] in valid_topics_set
  ]
  related_things['childTopics'] = [
      t for t in related_things['childTopics'] if t['dcid'] in valid_topics_set
  ]
  return related_things


def _node_to_topic_dict(n: Node, dc: str) -> Dict:
  # If this is an SV attached to SVPG, get the topic first.
  t = None
  if utils.is_sv(n.dcid):
    t = topic.get_parent_topics(n.dcid, dc)
    if t:
      # Pick one.
      t = t[0]
  else:
    # Its already a topic.
    t = {'dcid': n.dcid, 'name': n.name, 'types': n.types}
  return t


def _add_topic_to_related(t: Dict, related_things: Dict, dc: str):
  related_things['mainTopics'].append(t)
  # Get child topics.
  related_things['childTopics'].extend(topic.get_child_topics([t['dcid']], dc))
  # Get parent topics.
  pt = topic.get_parent_topics(t['dcid'], dc)
  related_things['parentTopics'].extend(pt)
  pt = [p['dcid'] for p in pt]
  if pt:
    # Pick only one parent topic deterministically!
    pt.sort()
    peer_topics = topic.get_child_topics([pt[0]], dc)
    related_things['peerTopics'].extend(
        [p for p in peer_topics if p['dcid'] != t['dcid']])


# Also delete non-existent child and parent places in detection!
def _trim_nonexistent_places(state: ftypes.PopulateState):
  detection = state.uttr.detection.places_detected

  # Existing placekeys
  exist_placekeys = set()
  for _, plmap in state.exist_checks.items():
    exist_placekeys.update(plmap.keys())

  # For child places, use a specific key:
  if detection.child_places and state.place_type:
    key = state.uttr.places[0].dcid + state.place_type.value
    if key not in exist_placekeys:
      detection.child_places = []
  else:
    # NOTE: state.place_type could have been reset in some
    # edge-cases, so clear out child-places.
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
