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

from flask import current_app
import requests

from server.lib import fetch
import server.lib.nl.common.constants as constants
from server.lib.nl.detection.types import Place
import server.services.datacommons as dc
import shared.lib.utils as utils


def _maps_place(place_str):
  if place_str.lower() in constants.SPECIAL_PLACE_REPLACEMENTS:
    logging.info(f"place_str {place_str} matched a special place.")
    place_str = constants.SPECIAL_PLACE_REPLACEMENTS[place_str.lower()]
    logging.info(f"place_str replaced with: {place_str}")

  api_key = current_app.config["MAPS_API_KEY"]
  # Note on 03/01/2023: switching to use the Maps Autocomplete API.
  url_formatted = f"{constants.MAPS_API}input={place_str}&key={api_key}&types={constants.AUTOCOMPLETE_MAPS_API_TYPES_FILTER}"
  r = requests.get(url_formatted)
  resp = r.json()

  # Canidates are all returned places with type matching MAPS_GEO_TYPES.
  places = []
  if "predictions" in resp:
    for res in resp["predictions"]:
      types_found = set(res["types"])

      if constants.MAPS_GEO_TYPES.intersection(types_found):
        places.append(res)

  if not places:
    logging.info(
        f"Maps API did not find a result of type in: {constants.MAPS_GEO_TYPES}. Query URL: {url_formatted}. Response: {resp}"
    )
    return {}

  # Pick the first one unless there is an exact match.
  best_match = places[0]
  for p in places:
    # If an exact match is found, look no further.
    main_text = p.get('structured_formatting', {}).get('main_text', '')
    if place_str.lower() == main_text.lower():
      best_match = p
      break
  
  return best_match


def remove_places(query, place_str_to_dcids: Dict[str, str]):
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


def get_place_from_dcids(place_dcids: List[str],
                         debug_logs: Dict) -> List[Place]:
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
      if ('dcid' in parent and 'type' in parent and
          parent['type'] == 'Country'):
        country = parent['dcid']
        break
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


def infer_place_dcids(places_str_found: List[str],
                      debug_logs: Dict) -> Dict[str, str]:
  if not places_str_found:
    logging.info("places_found is empty. Nothing to retrieve from Maps API.")

  override_places = []
  maps_api_failures = []
  no_dcids_found = []
  place_dcids = {}
  # Iterate over all the places until a valid place DCID is found.
  for p_str in places_str_found:
    place_dcid = ""
    # If this is a special place, return the known DCID.
    if p_str.lower() in constants.OVERRIDE_PLACE_TO_DCID_FOR_MAPS_API:
      place_dcid = constants.OVERRIDE_PLACE_TO_DCID_FOR_MAPS_API[p_str.lower()]
      logging.info(
          f"{p_str} was found in OVERRIDE_PLACE_TO_DCID_FOR_MAPS_API. Recording its DCID {place_dcid} without querying Maps API."
      )
      place_dcids[p_str] = place_dcid
      override_places.append((p_str.lower(), place_dcid))
      continue

    logging.info(f"Searching Maps API with: {p_str}")
    place = _maps_place(p_str)
    # If maps API returned a valid place, use the place_id to
    # get the dcid.
    if place and ("place_id" in place):
      place_id = place["place_id"]
      logging.info(
          f"MAPS API found place with place_id: {place_id} for place string: {p_str}."
      )
      place_ids_map = fetch.resolve_id([place_id], 'placeId', 'dcid')

      if place_id in place_ids_map and place_ids_map[place_id]:
        place_dcid = place_ids_map[place_id][0]
        logging.info(f"DC API found DCID: {place_dcid}")
        place_dcids[p_str] = place_dcid
      else:
        logging.info(
            f"Maps API found a place {place_id} but no DCID match found for place string: {p_str}."
        )
        no_dcids_found.append(place_id)
    else:
      logging.info(f"Maps API did not find a place for place string: {p_str}.")
      maps_api_failures.append(p_str)

  if not place_dcids:
    logging.info(
        f"No place DCIDs were found. Using places_found = {places_str_found}.")

  # Update the debug_logs dict.
  debug_logs.update({
      "dcids_resolved": place_dcids,
      "dcid_overrides_found": override_places,
      "maps_api_failures": maps_api_failures,
      "dcid_not_found_for_place_ids": no_dcids_found
  })
  return place_dcids


class NLPlaceDetector:
  """Performs all place detection for the NL modules."""

  def detect_place_ner(self, query: str) -> List[str]:
    # Making an API call to the NL models server.
    return dc.nl_detect_place_ner(query)

  def detect_places_heuristics(self, query: str) -> List[str]:
    """Returns all strings in the `query` detectd as places."""

    return utils.place_detection_with_heuristics(self.detect_place_ner, query)
