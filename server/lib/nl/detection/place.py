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
import re
from typing import Dict, List

from server.lib.nl.detection.place_recon import infer_place_dcids
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
import server.services.datacommons as dc
import shared.lib.utils as utils

MAX_IDENTICAL_NAME_PLACES = 5


#
# The main entrypoint for place detection using NER
# from a cleaned (no punctuations) query.
#
# Uses NER to detect place names, recons to DCIDs, produces PlaceDetection object.
#
def detect_from_query_ner(cleaned_query: str, orig_query: str,
                          query_detection_debug_logs: Dict) -> PlaceDetection:
  # Step 1: find all relevant places and the name/type of the main place found.
  places_str_found = _detect_places(cleaned_query)

  if not places_str_found:
    logging.info("Place detection failed.")

  logging.info("Found places in query: {}".format(places_str_found))

  query = cleaned_query
  place_dcids = []
  main_place = None
  resolved_places = []

  # Start updating the query_detection_debug_logs. Create space for place dcid inference
  # and place resolution. If they remain empty, the function belows were never triggered.
  query_detection_debug_logs["place_dcid_inference"] = {}
  query_detection_debug_logs["place_resolution"] = {}
  # Look to find place DCIDs.
  if places_str_found:
    place_dcids = infer_place_dcids(
        places_str_found, query_detection_debug_logs["place_dcid_inference"])
    logging.info(f"Found {len(place_dcids)} place dcids: {place_dcids}.")

  if place_dcids:
    resolved_places = get_place_from_dcids(
        place_dcids.values(), query_detection_debug_logs["place_resolution"])
    logging.info(
        f"Resolved {len(resolved_places)} place dcids: {resolved_places}.")

    # Step 2: replace the place strings with "" if place_dcids were found.
    # Typically, this could also be done under the check for resolved_places
    # but we don't expected the resolution from place dcids to fail (typically).
    # Also, even if the resolution fails, if there is a place dcid found, it should
    # be considered good enough to remove the place strings.
    query = _remove_places(cleaned_query.lower(), place_dcids)

  if resolved_places:
    main_place = resolved_places[0]
    logging.info(f"Using main_place as: {main_place}")

  # Set PlaceDetection.
  place_detection = PlaceDetection(query_original=orig_query,
                                   query_without_place_substr=query,
                                   query_places_mentioned=places_str_found,
                                   places_found=resolved_places,
                                   main_place=main_place)
  _set_query_detection_debug_logs(place_detection, query_detection_debug_logs)

  # This only makes sense for this flow.
  query_detection_debug_logs["query_transformations"] = {
      "place_detection_input": cleaned_query,
      "place_detection_with_places_removed": query,
  }
  return place_detection


#
# The main entrypoint for place detection using DC's Place
# Recognition API from a cleaned (no punctuations) query.
#
# Uses NER to detect place names, recons to DCIDs, produces PlaceDetection object.
#
def detect_from_query_dc(orig_query: str, debug_logs: Dict) -> PlaceDetection:
  # Recognize Places uses comma as a signal for contained-in-place.
  query = utils.remove_punctuations(orig_query, include_comma=True)

  query_items = dc.recognize_places(query)

  nonplace_query_parts = []
  places_str = []
  mains = []
  main2corrections = {}

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
      places_str.append(item['span'].lower())

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
      nonplace_query_parts.append(item['span'].lower())

  resolved_places = []
  if mains:
    resolved_places = get_place_from_dcids(mains,
                                           debug_logs["place_resolution"])

  main_place = None
  identicals = []
  peers = []
  if resolved_places:
    main_place = resolved_places[0]

  # Set PlaceDetection.
  query_without_place_substr = ' '.join(nonplace_query_parts)
  place_detection = PlaceDetection(
      query_original=query,
      query_without_place_substr=query_without_place_substr,
      query_places_mentioned=places_str,
      places_found=resolved_places,
      main_place=main_place,
      identical_name_as_main_place=identicals,
      peer_places=peers)
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
def detect_from_names(place_names: List[str], query_without_places: str,
                      orig_query: str,
                      query_detection_debug_logs: Dict) -> PlaceDetection:
  place_dcids = []
  main_place = None
  resolved_places = []

  # Start updating the query_detection_debug_logs. Create space for place dcid inference
  # and place resolution. If they remain empty, the function belows were never triggered.
  query_detection_debug_logs["place_dcid_inference"] = {}
  query_detection_debug_logs["place_resolution"] = {}
  # Look to find place DCIDs.
  if place_names:
    place_dcids = infer_place_dcids(
        place_names, query_detection_debug_logs["place_dcid_inference"])

  if place_dcids:
    resolved_places = get_place_from_dcids(
        place_dcids.values(), query_detection_debug_logs["place_resolution"])

  if resolved_places:
    main_place = resolved_places[0]

  # Set PlaceDetection.
  place_detection = PlaceDetection(
      query_original=orig_query,
      query_without_place_substr=query_without_places,
      query_places_mentioned=place_names,
      places_found=resolved_places,
      main_place=main_place)

  _set_query_detection_debug_logs(place_detection, query_detection_debug_logs)
  return place_detection


#
# Wrapper with NL Server API.
#
def _detect_places(query: str) -> List[str]:
  return utils.place_detection_with_heuristics(dc.nl_detect_place_ner, query)


#
# Helper function to remove place names from the given query.
#
def _remove_places(query, place_str_to_dcids: Dict[str, str]):
  for p_str in place_str_to_dcids.keys():
    # See if the word "in" precedes the place. If so, best to remove it too.
    needle = "in " + p_str
    if needle not in query:
      needle = p_str
    # Use \b<word>\b to match the word and not the string
    # within another word (eg to avoid match "us" in "houses").
    query = re.sub(rf"\b{needle}\b", "", query)

  # Remove any extra spaces and return.
  return ' '.join(query.split())


#
# Helper function to retrieve `Place` objects corresponding to DCIDs
# by using the DC API. `parent_places` if set, will have a map of
# dcid to empty list, to be populated by this function.
#
def get_place_from_dcids(
    place_dcids: List[str],
    debug_logs: Dict,
    parent_places: Dict[str, List[str]] = None) -> List[Place]:
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
      if parent_places:
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
  # Iterate in the same order as place_dcids.
  for p_dcid in place_dcids:

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
  return places


def _set_query_detection_debug_logs(d: PlaceDetection,
                                    query_detection_debug_logs: Dict):
  # Update the various place detection and query transformation debug logs dict.
  query_detection_debug_logs["places_found_str"] = d.query_places_mentioned
  query_detection_debug_logs["main_place_inferred"] = d.main_place
  if d.identical_name_as_main_place:
    query_detection_debug_logs["disambiguation_places"] = \
      '; '.join([p.dcid for p in d.identical_name_as_main_place])
  if d.peer_places:
    query_detection_debug_logs["similar_places"] = \
      '; '.join([p.name for p in d.peer_places])
  if not query_detection_debug_logs["place_dcid_inference"]:
    query_detection_debug_logs[
        "place_dcid_inference"] = "Place DCID Inference did not trigger (no place strings found)."
  if not query_detection_debug_logs["place_resolution"]:
    query_detection_debug_logs[
        "place_resolution"] = "Place resolution did not trigger (no place dcids found)."


#
# Given two lists of dcids, this function returns two parallel lists of
# Places by making a single DC API call.
#
def _get_places_for_listpair(similars, identicals):
  if not similars and not identicals:
    return [], []

  merged = list(set(similars + identicals))

  tmp = {}
  merged = get_place_from_dcids(merged, tmp)

  result = []
  for l in [similars, identicals]:
    # Make a map from dcid to Place
    pmap = {p.dcid: p for p in merged if p.dcid in l}
    # Create a Place list in the same order as input list
    result.append([pmap[p] for p in l if p in pmap])

  return result[0], result[1]
