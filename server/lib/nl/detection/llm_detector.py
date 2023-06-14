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
"""LLM based detector."""

import logging
from typing import Dict, List

from flask import current_app

from server.lib.nl.common import counters
from server.lib.nl.common import utterance
from server.lib.nl.detection import palm_api
from server.lib.nl.detection import types
from server.lib.nl.detection.place import get_place_from_dcids
from server.lib.nl.detection.place import infer_place_dcids
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection

# TODO: Add support for COMPARISON_FILTER and RANKING_FILTER
_LLM_TYPE_TO_CLASSIFICATION_TYPE = {
    'RANK': (types.ClassificationType.RANKING, 'ranking_type'),
    'SUB_PLACE_TYPE':
        (types.ClassificationType.CONTAINED_IN, 'contained_in_place_type'),
    'COMPARE': (None, None),
    'GROWTH': (types.ClassificationType.TIME_DELTA, 'time_delta_type'),
    'SIZE': (types.ClassificationType.SIZE_TYPE, 'size_type'),
    'DISASTER_EVENT': (types.ClassificationType.EVENT, 'event_type'),
}

_LLM_TYPE_TO_CLASSIFICATION_SUBTYPE = {
    'RANK': {
        'HIGH': types.RankingType.HIGH,
        'LOW': types.RankingType.LOW,
    },
    'SUB_PLACE_TYPE': {
        'CITY': types.ContainedInPlaceType.CITY.value,
        'COUNTY': types.ContainedInPlaceType.COUNTY.value,
        'PROVINCE': types.ContainedInPlaceType.PROVINCE.value,
        'DISTRICT': types.ContainedInPlaceType.DISTRICT.value,
        'STATE': types.ContainedInPlaceType.STATE.value,
        'COUNTRY': types.ContainedInPlaceType.COUNTRY.value,
        'HIGH_SCHOOL': types.ContainedInPlaceType.HIGH_SCHOOL.value,
        'MIDDLE_SCHOOL': types.ContainedInPlaceType.MIDDLE_SCHOOL.value,
        'ELEMENTARY_SCHOOL': types.ContainedInPlaceType.ELEMENTARY_SCHOOL.value,
        'PUBLIC_SCHOOL': types.ContainedInPlaceType.PUBLIC_SCHOOL.value,
    },
    'COMPARE': {},
    'GROWTH': {
        'INCREASE': types.TimeDeltaType.INCREASE,
        'DECREASE': types.TimeDeltaType.DECREASE,
    },
    'SIZE': {
        'BIG': types.SizeType.BIG,
        'SMALL': types.SizeType.SMALL,
    },
    'DISASTER_EVENT': {
        'FIRE': types.EventType.FIRE,
        'DROUGHT': types.EventType.DROUGHT,
        'FLOOD': types.EventType.FLOOD,
        'CYCLONE': types.EventType.CYCLONE,
        'EARTHQUAKE': types.EventType.EARTHQUAKE,
        'EXTREME_HEAT': types.EventType.HEAT,
        'EXTREME_COLD': types.EventType.COLD,
        'HIGH_WETBULB_TEMPERATURE': types.EventType.WETBULB,
    }
}


def _empty_svs_score_dict():
  return {"SV": [], "CosineScore": [], "SV_to_Sentences": {}, "MultiSV": {}}


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

  sv_list = llm_resp.get('METRICS', [])
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
  place_detection = PlaceDetection(
      query_original=query,
      query_without_place_substr=' ;  '.join(sv_list),
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

  classifications = []
  for t in sorted(_LLM_TYPE_TO_CLASSIFICATION_TYPE.keys()):
    cls = _llm2classification(llm_resp, t)
    if cls:
      classifications.append(cls)

  return Detection(original_query=query,
                   cleaned_query=query,
                   places_detected=place_detection,
                   svs_detected=sv_detection,
                   classifications=classifications,
                   llm_resp=llm_resp)


def _merge_sv_dicts(sv_list: List[str], svs_score_dicts: List[Dict]) -> Dict:
  if not svs_score_dicts:
    return _empty_svs_score_dict()
  if len(svs_score_dicts) == 1:
    return svs_score_dicts[0]

  # This is the case of multiple stat-vars detected by PaLM, which we should
  # merge into the MultiSV case, for downstream handling.

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


def _llm2classification(llm_resp: Dict, llm_ctype: str) -> types.NLClassifier:
  if llm_ctype not in llm_resp:
    return None

  llm_vals = _get_llm_vals(llm_resp[llm_ctype])
  if not llm_vals:
    return None

  if llm_ctype == 'COMPARE':
    # Special-case.
    if llm_vals[0] == 'COMPARE_PLACES':
      return types.NLClassifier(
          type=types.ClassificationType.COMPARISON,
          attributes=types.ComparisonClassificationAttributes(
              comparison_trigger_words=[]))
    elif llm_vals[0] == 'COMPARE_METRICS':
      return types.NLClassifier(
          type=types.ClassificationType.CORRELATION,
          attributes=types.CorrelationClassificationAttributes(
              correlation_trigger_words=[]))
    return None

  ctype, dict_key = _LLM_TYPE_TO_CLASSIFICATION_TYPE[llm_ctype]
  submap = _LLM_TYPE_TO_CLASSIFICATION_SUBTYPE[llm_ctype]
  matches = [submap[v] for v in llm_vals if v in submap]
  if not matches:
    return None
  if llm_ctype == 'SUB_PLACE_TYPE':
    # This only supports a singleton.
    matches = matches[0]

  cdict = {
      'type': ctype,
      dict_key: matches,
  }
  logging.info(f'DICT: {cdict}')
  return utterance.dict_to_classification([cdict])[0]


# Vals may only be a string or a list.
def _get_llm_vals(val) -> List[str]:
  if isinstance(val, str):
    return [val]
  if isinstance(val, list) and all(isinstance(it, str) for it in val):
    return val
  return []
