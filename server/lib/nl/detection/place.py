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

import logging
from typing import Dict, List

from server.lib.fetch import property_values
from server.lib.nl.detection.types import Entity
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
import server.services.datacommons as dc
import shared.lib.utils as utils

MAX_IDENTICAL_NAME_PLACES = 5


#
# The main entrypoint for place detection using DC's Place
# Recognition API from a cleaned (no punctuations) query.
#
def detect_from_query_dc(orig_query: str,
                         debug_logs: Dict,
                         allow_triples: bool = False) -> PlaceDetection:
  # Recognize Places uses comma as a signal for contained-in-place.
  query = utils.remove_punctuations(orig_query, include_comma=True)

  query_items = dc.recognize_places(query)

  mains = []
  main2corrections = {}
  # Dictionary of dcid to the query substring that matched to the dcid
  main2substr = {}
  # List of parts in the query where parts are replaced by their matched dcid if
  # there was a match.
  query_parts_with_dcids = []

  debug_logs["place_dcid_inference"] = {}
  debug_logs["place_resolution"] = {}
  debug_logs["dc_recognize_places"] = {}

  for item in query_items:
    if 'span' not in item:
      continue
    if 'places' in item and item['places'] and 'dcid' in item['places'][0]:
      # Use the first DCID for now.
      main = item['places'][0]['dcid']
      mains.append(main)
      query_parts_with_dcids.append(main)
      main2substr[main] = item['span'].lower()

      related = []
      for rp in item['places'][1:MAX_IDENTICAL_NAME_PLACES + 1]:
        if 'dcid' in rp:
          related.append(rp['dcid'])
      main2corrections[main] = related

      # For logging, get all DCIDs:
      debug_logs["dc_recognize_places"][item['span']] = [
          d['dcid'] for d in item['places'] if 'dcid' in d
      ]
    else:
      # there was no DCID recognized from the span, so add the span (which is
      # just a substring from the query)
      query_parts_with_dcids.append(item['span'].lower())

  resolved_places = []
  resolved_entities = []
  parent_map = {}
  if mains:
    resolved_places, parent_map = get_place_from_dcids(
        mains, debug_logs["place_resolution"])
    if allow_triples:
      resolved_entities = _get_non_place_entities(mains, resolved_places)
  resolved_place_dcids = set([p.dcid for p in resolved_places])

  main_place = None
  peers = []
  parent_places = []
  if resolved_places:
    main_place = resolved_places[0]
    parent_places = parent_map.get(main_place.dcid, [])

  # Set PlaceDetection.
  places_str = []
  nonplace_query_parts = []
  for p in query_parts_with_dcids:
    if p in resolved_place_dcids:
      # The query part is a place dcid so add its original string to places_str
      places_str.append(main2substr[p])
    else:
      # The query part is not a place dcid, so add its original string to
      # nonplace_query_parts
      nonplace_query_parts.append(main2substr.get(p, p))
  query_without_place_substr = ' '.join(nonplace_query_parts)
  place_detection = PlaceDetection(
      query_original=query,
      query_without_place_substr=query_without_place_substr,
      query_places_mentioned=places_str,
      places_found=resolved_places,
      main_place=main_place,
      peer_places=peers,
      parent_places=parent_places,
      entities_found=resolved_entities)
  _set_query_detection_debug_logs(place_detection, debug_logs)
  # This only makes sense for this flow.
  debug_logs["query_transformations"] = {
      "place_detection_input": query,
      "place_detection_with_places_removed": query_without_place_substr,
  }
  return place_detection


#
# The entry point for building PlaceDetection if we've already detected place names.
# Uses recon to map to DCIDs.
#
def detect_from_names(place_names: List[str],
                      query_without_places: str,
                      orig_query: str,
                      query_detection_debug_logs: Dict,
                      allow_triples: bool = False) -> PlaceDetection:
  place_dcids = []
  main_place = None
  resolved_places = []
  # entities that were detected that are not a place
  resolved_entities = []
  parent_map = {}
  parent_places = []

  # Start updating the query_detection_debug_logs. Create space for place dcid inference
  # and place resolution. If they remain empty, the function belows were never triggered.
  query_detection_debug_logs["place_dcid_inference"] = {}
  query_detection_debug_logs["place_resolution"] = {}
  # Look to find place DCIDs.
  if place_names:
    name2dcids = dc.find_entities(place_names)
    place_dcids = {n: d[0] for n, d in name2dcids.items() if d}

  if place_dcids:
    resolved_places, parent_map = get_place_from_dcids(
        place_dcids.values(), query_detection_debug_logs["place_resolution"])
    if allow_triples:
      resolved_entities = _get_non_place_entities(place_dcids.values(),
                                                  resolved_places)
  if resolved_places:
    main_place = resolved_places[0]
    parent_places = parent_map.get(main_place.dcid, [])

  # Set PlaceDetection.
  place_detection = PlaceDetection(
      query_original=orig_query,
      query_without_place_substr=query_without_places,
      query_places_mentioned=place_names,
      places_found=resolved_places,
      main_place=main_place,
      parent_places=parent_places,
      entities_found=resolved_entities)

  _set_query_detection_debug_logs(place_detection, query_detection_debug_logs)
  return place_detection


#
# Helper function to retrieve `Place` objects corresponding to DCIDs
# by using the DC API. `parent_places` if set, will have a map of
# dcid to empty list, to be populated by this function.
#
def get_place_from_dcids(place_dcids: List[str], debug_logs: Dict) -> any:
  parent_places = {p: [] for p in place_dcids}
  place_info_result = dc.get_place_info(place_dcids)
  dcid2place = {}
  for res in place_info_result.get('data', []):
    if 'node' not in res or 'info' not in res:
      continue
    dcid = res['node']
    info = res['info']
    if 'self' not in info:
      continue
    self = info['self']
    if 'name' not in self or 'type' not in self:
      continue
    name = self['name']
    ptype = self['type']
    country = None
    for parent in info.get('parents', []):
      if 'dcid' not in parent or 'type' not in parent or 'name' not in parent:
        continue
      parent_places[dcid].append(
          Place(dcid=parent['dcid'],
                name=parent['name'],
                place_type=parent['type']))
      if parent['type'] == 'Country':
        country = parent['dcid']
    if not country and ptype == 'Country':
      # Set country for entities of type country too, so
      # downstream code can rely on it.
      country = dcid
    dcid2place[dcid] = Place(dcid=dcid,
                             name=name,
                             place_type=ptype,
                             country=country)

  places = []
  dc_resolve_failures = []
  added = set()
  # Iterate in the same order as place_dcids.
  for p_dcid in place_dcids:
    if p_dcid in added:
      continue
    added.add(p_dcid)

    if p_dcid not in dcid2place:
      logging.info(
          f"Place DCID ({p_dcid}) did not correspond to a place_type and/or place name."
      )
      dc_resolve_failures.append(p_dcid)
    else:
      places.append(dcid2place[p_dcid])

  debug_logs.update({
      "dc_resolution_failure": dc_resolve_failures,
      "dc_resolved_places": places,
  })
  return places, parent_places


#
# Helper function to get resolved entities that are not places.
#
def _get_non_place_entities(all_entities: List[str],
                            resolved_places: List[Place]) -> List[Entity]:
  entities = []
  places = set([p.dcid for p in resolved_places])
  non_place_entities = [e for e in all_entities if not e in places]
  if non_place_entities:
    names = property_values(non_place_entities, 'name')
    # TODO: get type as well for downstream decisions
    for e in non_place_entities:
      e_names = names.get(e, [])
      e_name = e_names[0] if len(e_names) > 0 else e
      entities.append(Entity(dcid=e, name=e_name, type=''))
  return entities


def _set_query_detection_debug_logs(d: PlaceDetection,
                                    query_detection_debug_logs: Dict):
  # Update the various place detection and query transformation debug logs dict.
  query_detection_debug_logs["places_found_str"] = d.query_places_mentioned
  query_detection_debug_logs["main_place_inferred"] = d.main_place
  if d.peer_places:
    query_detection_debug_logs["similar_places"] = \
      '; '.join([p.name for p in d.peer_places])
  if not query_detection_debug_logs["place_dcid_inference"]:
    query_detection_debug_logs[
        "place_dcid_inference"] = "Place DCID Inference did not trigger (no place strings found)."
  if not query_detection_debug_logs["place_resolution"]:
    query_detection_debug_logs[
        "place_resolution"] = "Place resolution did not trigger (no place dcids found)."
