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

import copy
import logging
import sys
from typing import Dict, List

from server.lib.nl.common import counters
from server.lib.nl.common import serialize
from server.lib.nl.common import utterance
from server.lib.nl.detection import palm_api
from server.lib.nl.detection import place
from server.lib.nl.detection import types
from server.lib.nl.detection import utils as dutils
from server.lib.nl.detection import variable
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import LlmApiType

# TODO: Add support for COMPARISON_FILTER and RANKING_FILTER
_LLM_TYPE_TO_CLASSIFICATION_TYPE = {
    'RANK': (types.ClassificationType.RANKING, 'ranking_type'),
    'SUB_PLACE_TYPE':
        (types.ClassificationType.CONTAINED_IN, 'contained_in_place_type'),
    'GROWTH': (types.ClassificationType.TIME_DELTA, 'time_delta_type'),
    'SUPERLATIVE': (types.ClassificationType.SUPERLATIVE, 'superlatives'),
    'DISASTER_EVENT': (types.ClassificationType.EVENT, 'event_type'),
}

# These need special handling and do not fit the
# _LLM_TYPE_TO_CLASSIFICATION_TYPE map.
_SPECIAL_LLM_TYPE_CLASSIFICATIONS = [
    'COMPARE', 'COMPARISON_FILTER', 'RANKING_FILTER'
]

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
        'ZIP': types.ContainedInPlaceType.ZIP.value,
        'TRACT': types.ContainedInPlaceType.CENSUS_TRACT.value,
    },
    'GROWTH': {
        'INCREASE': types.TimeDeltaType.INCREASE,
        'DECREASE': types.TimeDeltaType.DECREASE,
        'CHANGE': types.TimeDeltaType.CHANGE,
    },
    'SUPERLATIVE': {
        'BIG': types.SuperlativeType.BIG,
        'SMALL': types.SuperlativeType.SMALL,
        'RICH': types.SuperlativeType.RICH,
        'POOR': types.SuperlativeType.POOR,
        'LIST': types.SuperlativeType.LIST,
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
    },
}

_LLM_OP_TO_QUANTITY_OP = {
    'EQUAL': types.QCmpType.EQ,
    'GREATER_THAN': types.QCmpType.GT,
    'GREATER_THAN_OR_EQUAL': types.QCmpType.GE,
    'LESSER_THAN': types.QCmpType.LT,
    'LESSER_THAN_OR_EQUAL': types.QCmpType.LE,
}


# Returns False if the query fails safety check.
def check_safety(query: str, llm_api_type: LlmApiType,
                 ctr: counters.Counters) -> Detection:
  if llm_api_type == LlmApiType.Text:
    llm_resp = palm_api.detect_via_text(query, [], ctr)
  else:
    llm_resp = palm_api.detect_via_chat(query, [], ctr)
  if llm_resp.get('UNSAFE') == True:
    return False
  return True


def detect(query: str, prev_utterance: utterance.Utterance, index_type: str,
           llm_api_type: LlmApiType, query_detection_debug_logs: Dict,
           ctr: counters.Counters) -> Detection:
  # History
  history = []
  u = prev_utterance
  while u:
    history.append((u.query, u.llm_resp))
    u = u.prev_utterance

  if llm_api_type == LlmApiType.Text:
    llm_resp = palm_api.detect_via_text(query, history, ctr)
  else:
    llm_resp = palm_api.detect_via_chat(query, history, ctr)

  if llm_resp.get('UNSAFE') == True:
    return None

  # Need to append to sv_list below, so make a copy.
  sv_list = copy.deepcopy(llm_resp.get('METRICS', []))
  places_str_found = llm_resp.get('PLACES', [])

  # Process filters.
  filter_type = None
  for f, m in [('COMPARISON_FILTER', 'COMPARISON_METRIC'),
               ('RANKING_FILTER', 'RANKING_METRIC')]:
    if sv_list and llm_resp.get(f) and len(llm_resp[f]) == 1:
      vals = _get_llm_vals(llm_resp[f][0].get(m, []))
      if len(vals) == 1:
        if vals[0] not in sv_list:
          sv_list.append(vals[0])
        filter_type = f
        break

  if not places_str_found:
    ctr.err('failed_place_detection', llm_resp)

  place_detection = place.detect_from_names(
      place_names=places_str_found,
      query_without_places=' ; '.join(sv_list),
      orig_query=query,
      query_detection_debug_logs=query_detection_debug_logs)

  query_detection_debug_logs["llm_response"] = llm_resp
  query_detection_debug_logs["query_transformations"] = {
      "sv_detection_query_index_type": index_type
  }

  # SV Detection.
  svs_score_dicts = []
  dummy_dict = {}
  for sv in sv_list:
    try:
      svs_score_dicts.append(variable.detect_svs(sv, index_type, dummy_dict))
    except ValueError as e:
      logging.info(e)
  svs_scores_dict = _merge_sv_dicts(sv_list, svs_score_dicts)
  sv_detection = dutils.create_sv_detection(query, svs_scores_dict)

  classifications = _build_classifications(llm_resp, filter_type)

  return Detection(original_query=query,
                   cleaned_query=query,
                   places_detected=place_detection,
                   svs_detected=sv_detection,
                   classifications=classifications,
                   llm_resp=llm_resp,
                   detector=ActualDetectorType.LLM,
                   llm_api=llm_api_type)


def _build_classifications(llm_resp: Dict,
                           filter_type: str) -> List[types.NLClassifier]:
  # Handle other keys in LLM Response.
  classifications: List[types.NLClassifier] = []
  for t in _SPECIAL_LLM_TYPE_CLASSIFICATIONS + sorted(
      _LLM_TYPE_TO_CLASSIFICATION_TYPE.keys()):
    if t not in llm_resp:
      continue

    c = None
    if t in _LLM_TYPE_TO_CLASSIFICATION_TYPE:
      c = _handle_llm2classification(t, llm_resp)
    elif t == 'COMPARE':
      llm_vals = _get_llm_vals(llm_resp[t])
      if not llm_vals:
        continue
      c = _handle_compare(llm_vals[0])
    elif t == filter_type:
      # Earlier caller had set filter_type by checking llm_resp,
      # should be safe to do llm_resp[t][0].
      c = _handle_quantity(llm_resp[t][0], t)
    if c:
      classifications.append(c)
  return classifications


def _merge_sv_dicts(sv_word_list: List[str],
                    sv_scores_list: List[Dict]) -> Dict:
  if not sv_scores_list:
    return dutils.empty_svs_score_dict()
  if len(sv_scores_list) == 1:
    return sv_scores_list[0]

  # This is the case of multiple stat-vars detected by PaLM, which we should
  # merge into the MultiSV case, for downstream handling.

  # Just something to fill up 'SV', 'CosineScore', etc.
  merged_dict = sv_scores_list[0]

  parts = []
  for i in range(len(sv_scores_list)):
    parts.append({
        'QueryPart': sv_word_list[i],
        'SV': sv_scores_list[i]['SV'],
        'CosineScore': sv_scores_list[i]['CosineScore']
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


def _handle_compare(llm_val: str):
  # Special-case.
  if llm_val == 'COMPARE_PLACES':
    return types.NLClassifier(
        type=types.ClassificationType.COMPARISON,
        attributes=types.ComparisonClassificationAttributes(
            comparison_trigger_words=[]))
  elif llm_val == 'COMPARE_METRICS':
    return types.NLClassifier(
        type=types.ClassificationType.CORRELATION,
        attributes=types.CorrelationClassificationAttributes(
            correlation_trigger_words=[]))
  return None


def _handle_llm2classification(llm_ctype: str,
                               llm_resp: Dict) -> types.NLClassifier:
  llm_vals = _get_llm_vals(llm_resp[llm_ctype])
  if not llm_vals:
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
  return serialize.dict_to_classification([cdict])[0]


def _handle_quantity(filter: Dict, ctype: str) -> types.NLClassifier:
  qty = None
  if ctype == 'RANKING_FILTER':
    rank = filter.get('RANKING_OPERATOR', '')
    if rank == 'IS_HIGHEST':
      # Map highest as >= lowest value ever.  Fulfillment will do the rest.
      qty = types.Quantity(cmp=types.QCmpType.GE, val=sys.float_info.min)
    elif rank == 'IS_LOWEST':
      # Map lowest as <= highest value ever.  Fulfillment will do the rest.
      qty = types.Quantity(cmp=types.QCmpType.LE, val=sys.float_info.max)
  else:
    op = filter.get('COMPARISON_OPERATOR', '')
    val = filter.get('VALUE', '')
    try:
      val = float(val)
      qop = _LLM_OP_TO_QUANTITY_OP.get(op, None)
      if qop:
        qty = types.Quantity(cmp=qop, val=val)
    except ValueError:
      pass
  if not qty:
    return None
  return types.NLClassifier(type=types.ClassificationType.QUANTITY,
                            attributes=types.QuantityClassificationAttributes(
                                qval=qty, qrange=None, idx=0))


# Vals may only be a string or a list.
def _get_llm_vals(val) -> List[str]:
  if isinstance(val, str):
    return [val]
  if isinstance(val, list) and all(isinstance(it, str) for it in val):
    return val
  return []
