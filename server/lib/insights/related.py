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

import time
from typing import Dict, List

import server.lib.nl.common.topic as topic
import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.types as ftypes


def compute_related_things(state: ftypes.PopulateState):
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

  # Expand to parent and peer topics.
  # Do this only for the "main" SV, otherwise it gets weird to show
  # multiple sets of parents / peers.
  if state.uttr.svs:
    start = time.time()
    pt = topic.get_parent_topics([state.uttr.svs[0]])
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
