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
"""Detection entry point for Datacommons NL"""

import logging
from typing import Dict, List

from flask import current_app

from server.lib.nl.common import counters
from server.lib.nl.detection import palm_api
from server.lib.nl.detection.place import get_place_from_dcids
from server.lib.nl.detection.place import infer_place_dcids
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection


def _empty_svs_score_dict():
  return {"SV": [], "CosineScore": [], "SV_to_Sentences": {}}


def detect(query: str, context_history: Dict, index_type: str,
           query_detection_debug_logs: Dict,
           ctr: counters.Counters) -> Detection:
  model = current_app.config['NL_MODEL']

  # History
  history = []
  for i in range(len(context_history)):
    ctx = context_history[len(context_history) - 1 - i]
    history.append((ctx['query'], ctx['llm_resp']))

  llm_resp = palm_api.call(query, history, ctr)

  places_str_found = llm_resp.get('PLACES', [])

  if not places_str_found:
    logging.info("Place detection failed.")

  logging.info("Found places in query: {}".format(places_str_found))

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

  if resolved_places:
    main_place = resolved_places[0]
    logging.info(f"Using main_place as: {main_place}")

  # Set PlaceDetection.
  place_detection = PlaceDetection(query_original=query,
                                   query_without_place_substr=query,
                                   query_places_mentioned=places_str_found,
                                   places_found=resolved_places,
                                   main_place=main_place)

  # Update the various place detection and query transformation debug logs dict.
  query_detection_debug_logs["places_found_str"] = places_str_found
  query_detection_debug_logs["main_place_inferred"] = main_place
  query_detection_debug_logs["llm_response"] = llm_resp

  if not query_detection_debug_logs["place_dcid_inference"]:
    query_detection_debug_logs[
        "place_dcid_inference"] = "Place DCID Inference did not trigger (no place strings found)."
  if not query_detection_debug_logs["place_resolution"]:
    query_detection_debug_logs[
        "place_resolution"] = "Place resolution did not trigger (no place dcids found)."

  sv_list = llm_resp.get('METRICS', [])
  svs_score_dicts = []
  dummy_dict = {}
  for sv in sv_list:
    try:
      svs_score_dicts.append(model.detect_svs(sv, index_type, dummy_dict))
    except ValueError as e:
      logging.info(e)
  svs_scores_dict = _merge_sv_dicts(sv_list, svs_score_dicts)

  # Set the SVDetection.
  sv_detection = SVDetection(
      query=query,
      sv_dcids=svs_scores_dict['SV'],
      sv_scores=svs_scores_dict['CosineScore'],
      svs_to_sentences=svs_scores_dict['SV_to_Sentences'],
      multi_sv=svs_scores_dict['MultiSV'])

  # TODO: Infer the various classifications!

  return Detection(original_query=query,
                   cleaned_query=query,
                   places_detected=place_detection,
                   svs_detected=sv_detection,
                   classifications=[],
                   llm_resp=llm_resp)


def _merge_sv_dicts(sv_list: List[str], svs_score_dicts: List[Dict]) -> Dict:
  if not svs_score_dicts:
    return _empty_svs_score_dict()
  if len(svs_score_dicts) == 1:
    return svs_score_dicts[0]

  # This is the case of multiple since SV, which we should merge into
  # the MultiSV case.

  # Just something to fill up 'SV', 'CosineScore', etc.
  merged_dict = svs_score_dicts[0]

  parts = []
  for i in range(len(svs_score_dicts)):
    parts.append({
        'QueryPart': sv_list[i],
        'SV': svs_score_dicts[i]['SV'],
        'CosineScore': svs_score_dicts[i]['CosineScore']
    })
  # Set aggregate_score to 1.0 so that this should always trump singleSV case.
  merged_dict['MultiSV'] = {
      'Candidates': [{
          'Parts': parts,
          'AggCosineScore': 1.0,
          'DelimBased': True
      }]
  }
  return merged_dict
