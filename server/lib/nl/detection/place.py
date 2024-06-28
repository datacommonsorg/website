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

from dataclasses import dataclass
import re
from typing import Dict, List, Set

from server.lib.fetch import property_values
from server.lib.nl.detection.types import Entity
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
import server.services.datacommons as dc
import shared.lib.utils as utils

MAX_IDENTICAL_NAME_PLACES = 5
# Max number of non-place entities to keep in the query before removing all
# entities. We by default keep non-place entities in the query because these may
# be part of the variables being asked for. If there are many non-place entities
# then we assume they are being asked for as the entities in the query.
_MAX_ENTITIES_QUERY = 2

_PLACE_PREPOSITION_REGEX = r"\s*(in|in the|of|of the)$"


@dataclass
class QueryPart:
  # The actual substring from the query for this part of the query.
  substr: str
  # The dcid this query part matched to. Empty if it didn't match to a dcid.
  dcids: List[str] = ''


#
# The main entrypoint for place detection using DC's Place
# Recognition API from a cleaned (no punctuations) query.
#
def detect_from_query_dc(orig_query: str,
                         debug_logs: Dict,
                         allow_triples: bool = False) -> PlaceDetection:
  # Recognize Places uses comma as a signal for contained-in-place.
  query = utils.remove_punctuations(orig_query, include_comma=True)

  # Set up debug logs
  debug_logs["place_dcid_inference"] = {}
  debug_logs["place_resolution"] = {}
  debug_logs["dc_recognize_places"] = {}

  # Get the query parts for places in the query
  place_query_items = dc.recognize_places(query)
  place_query_parts = _get_query_parts(place_query_items, 'places',
                                       debug_logs["dc_recognize_places"])

  # Get resolved places and parent map using the first recognized place DCID for
  # each place query part.
  place_main_dcids = [p.dcids[0] for p in place_query_parts if p.dcids]
  resolved_places, parent_map = get_place_from_dcids(
      place_main_dcids, debug_logs["place_resolution"])

  # Set main place and parent places
  main_place = None
  parent_places = []
  if resolved_places:
    main_place = resolved_places[0]
    parent_places = parent_map.get(main_place.dcid, [])

  # Get the parts of the query that resolved to a place and the query string
  # with those parts stripped out
  resolved_place_dcids = set([p.dcid for p in resolved_places])
  places_str, stripped_query_str = _get_stripped_string(place_query_parts,
                                                        resolved_place_dcids)

  resolved_entities = []
  entities_str = []
  if allow_triples:
    # Get the query parts for entities in the query that already has places
    # stripped out. This is to ensure that we are only resolving each part of
    # the query to one of entity or place
    debug_logs["dc_recognize_entities"] = {}
    entity_query_items = dc.recognize_entities(stripped_query_str)
    entity_query_parts = _get_query_parts(entity_query_items, 'entities',
                                          debug_logs["dc_recognize_entities"])

    # Get resolved entities
    resolved_entities = _get_resolved_entities(entity_query_parts)
    resolved_entity_dcids = set([e.dcid for e in resolved_entities])

    # Get the parts of the query (with places already stripped out) that
    # resolved to an entity and the query string with those parts also stripped
    # out in addition to the places that are already stripped out.
    entities_str, stripped_entities_query_str = _get_stripped_string(
        entity_query_parts, resolved_entity_dcids)

    # The stripped query string returned by place detection should only have
    # entities stripped out if there were no places stripped OR there are more
    # that _MAX_ENTITIES_QUERY entity strings found. This is because the
    # stripped query string will eventually be used for sv/prop detection and
    # some entities may be part of entity descriptions
    if not places_str or len(entities_str) > _MAX_ENTITIES_QUERY:
      stripped_query_str = stripped_entities_query_str

  place_detection = PlaceDetection(
      query_original=query,
      query_without_place_substr=stripped_query_str,
      query_places_mentioned=places_str,
      places_found=resolved_places,
      main_place=main_place,
      peer_places=[],
      parent_places=parent_places,
      entities_found=resolved_entities,
      query_entities_mentioned=entities_str)
  _set_query_detection_debug_logs(place_detection, debug_logs)
  # This only makes sense for this flow.
  debug_logs["query_transformations"] = {
      "place_detection_input": query,
      "place_detection_with_places_removed": stripped_query_str,
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
  place_or_entity_dcids = {}
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
    place_or_entity_dcids = {n: d[0] for n, d in name2dcids.items() if d}

  resolved_places, parent_map = get_place_from_dcids(
      place_or_entity_dcids.values(),
      query_detection_debug_logs["place_resolution"])
  if allow_triples:
    resolved_entities = _get_non_place_entities(place_or_entity_dcids.values(),
                                                resolved_places)
  if resolved_places:
    main_place = resolved_places[0]
    parent_places = parent_map.get(main_place.dcid, [])

  resolved_place_dcids = set([e.dcid for e in resolved_places])
  entities_str = []
  places_str = []
  for n, d in place_or_entity_dcids.items():
    if d in resolved_place_dcids:
      places_str.append(n)
    else:
      entities_str.append(n)

  # Set PlaceDetection.
  place_detection = PlaceDetection(
      query_original=orig_query,
      query_without_place_substr=query_without_places,
      query_places_mentioned=places_str,
      places_found=resolved_places,
      main_place=main_place,
      parent_places=parent_places,
      entities_found=resolved_entities,
      query_entities_mentioned=entities_str)

  _set_query_detection_debug_logs(place_detection, query_detection_debug_logs)
  return place_detection


#
# Helper function to retrieve `Place` objects corresponding to DCIDs
# by using the DC API. `parent_places` if set, will have a map of
# dcid to empty list, to be populated by this function.
#
def get_place_from_dcids(place_dcids: List[str], debug_logs: Dict) -> any:
  if not place_dcids:
    return [], {}
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
      dc_resolve_failures.append(p_dcid)
    else:
      places.append(dcid2place[p_dcid])

  debug_logs.update({
      "dc_resolution_failure": dc_resolve_failures,
      "dc_resolved_places": places,
  })
  return places, parent_places


#
# Helper function to get resolved entities that are not places. If no
# resolved_places passed, will get the resolved entity object for every dcid in
# all_entities.
#
def _get_non_place_entities(all_entities: List[str],
                            resolved_places: List[Place] = []) -> List[Entity]:
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


#
# Helper function to convert a list of query items that come from a recgonize
# API (dc.recognize_places or dc.recognize_entities) into a list of query parts.
#
def _get_query_parts(query_items: List[Dict[str, any]], items_key: str,
                     debug_logs: Dict[str, any]) -> List[QueryPart]:
  query_parts = []
  for item in query_items:
    if 'span' not in item:
      continue
    if items_key in item and item[items_key] and 'dcid' in item[items_key][0]:
      dcids = [d['dcid'] for d in item[items_key] if 'dcid' in d]
      query_parts.append(QueryPart(substr=item['span'].lower(), dcids=dcids))

      # log the dcids:
      debug_logs[item['span']] = dcids
    else:
      query_parts.append(QueryPart(substr=item['span'].lower()))
  return query_parts


#
# Helper function to get the list of strings that correspond to a resolved dcid
# and the query string with all those strings stripped out
#
def _get_stripped_string(query_parts: List[QueryPart],
                         resolved_dcids: Set[str]) -> tuple[List[str], str]:
  resolved_dcids_str = []
  stripped_query_parts = []
  for p in query_parts:
    if any([p_dcid in resolved_dcids for p_dcid in p.dcids]):
      # if any of the dcids in the query part is resolved, consider the query part
      # resolved and add the original string to resolved_things_str
      resolved_dcids_str.append(p.substr)
      if len(stripped_query_parts) > 0:
        stripped_query_parts[-1] = re.sub(_PLACE_PREPOSITION_REGEX, "",
                                          stripped_query_parts[-1])
    else:
      stripped_query_parts.append(p.substr)
  stripped_query_str = ' '.join(stripped_query_parts)
  return resolved_dcids_str, stripped_query_str


#
# Gets the resolved entities from a list of query parts with non place entities
# recognized.
#
def _get_resolved_entities(query_parts: List[QueryPart]) -> List[Entity]:
  seen_dcids = set()
  entity_dcids = []
  for e in query_parts:
    if not e.dcids:
      continue
    new_dcids = [d for d in e.dcids if not d in seen_dcids]
    seen_dcids.update(new_dcids)
    # sort the dcids so that the list is deterministic
    # TODO: sort on something better like more common types or other criteria
    entity_dcids.extend(sorted(new_dcids))
  return _get_non_place_entities(entity_dcids)


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
