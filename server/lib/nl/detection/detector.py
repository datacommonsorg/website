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
"""Router for detection."""

from typing import Dict, List

from flask import current_app

from server.lib.nl.common import serialize
from server.lib.nl.common import utils
from server.lib.nl.common.counters import Counters
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection import heuristic_detector
from server.lib.nl.detection import llm_detector
from server.lib.nl.detection import llm_fallback
from server.lib.nl.detection import place
from server.lib.nl.detection import rerank
from server.lib.nl.detection import types
from server.lib.nl.detection.place_utils import get_similar
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import LlmApiType
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import RequestedDetectorType
from server.lib.nl.detection.utils import empty_var_candidates
from server.lib.nl.detection.utils import get_multi_sv
import shared.lib.detected_variables as dutils

_LLM_API_DETECTORS = [
    RequestedDetectorType.LLM.value,
    RequestedDetectorType.Hybrid.value,
    RequestedDetectorType.HybridSafetyCheck.value,
]

MAX_CHILD_LIMIT = 50


#
# The main function that routes across Heuristic and LLM detectors.
#
# For `hybrid` detection, it first calls Heuristic detector, and
# based on `need_llm()`, decides to call the LLM detector.
#
def detect(detector_type: str,
           original_query: str,
           no_punct_query: str,
           prev_utterance: Utterance,
           embeddings_index_type: str,
           llm_api_type: LlmApiType,
           query_detection_debug_logs: Dict,
           mode: str,
           counters: Counters,
           rerank_fn: rerank.RerankCallable = None,
           allow_triples: bool = False) -> types.Detection:
  #
  # In the absence of the PALM API key, fallback to heuristic.
  #
  if (detector_type in _LLM_API_DETECTORS and
      'LLM_API_KEY' not in current_app.config):
    counters.err('failed_llm_keynotfound', '')
    detector_type = RequestedDetectorType.Heuristic.value

  if (detector_type in _LLM_API_DETECTORS and
      'LLM_PROMPT_TEXT' not in current_app.config):
    counters.err('failed_llm_promptnotfound', '')
    detector_type = RequestedDetectorType.Heuristic.value

  #
  # LLM Detection.
  #
  if detector_type == RequestedDetectorType.LLM.value:
    llm_detection = llm_detector.detect(original_query, prev_utterance,
                                        embeddings_index_type, llm_api_type,
                                        query_detection_debug_logs, mode,
                                        counters, rerank_fn, allow_triples)
    return llm_detection

  #
  # Heuristic detection.
  #
  heuristic_detection = heuristic_detector.detect(
      original_query, no_punct_query, embeddings_index_type,
      query_detection_debug_logs, mode, counters, rerank_fn, allow_triples)
  if detector_type == RequestedDetectorType.Heuristic.value:
    return heuristic_detection

  #
  # This is Hybrid flow now.  First check if need LLM fallback.
  #
  llm_type = llm_fallback.need_llm(heuristic_detection, prev_utterance,
                                   counters)
  if llm_type == llm_fallback.NeedLLM.No:
    heuristic_detection.detector = ActualDetectorType.HybridHeuristic
    return heuristic_detection

  counters.err('warning_llm_fallback', '')

  if detector_type == RequestedDetectorType.HybridSafetyCheck.value:
    heuristic_detection.detector = ActualDetectorType.HybridLLMSafety
    heuristic_detection.llm_api = llm_api_type
    if llm_detector.check_safety(original_query, llm_api_type, counters):
      return heuristic_detection
    else:
      counters.err('info_llm_blocked', '')
      return None

  llm_detection = llm_detector.detect(original_query, prev_utterance,
                                      embeddings_index_type, llm_api_type,
                                      query_detection_debug_logs, mode,
                                      counters, rerank_fn, allow_triples)
  if not llm_detection:
    counters.err('info_llm_blocked', '')
    return None

  if llm_type == llm_fallback.NeedLLM.Fully:
    # Completely use LLM's detections.
    detection = llm_detection
    detection.detector = ActualDetectorType.HybridLLMFull
  elif llm_type == llm_fallback.NeedLLM.ForVar:
    # Use place stuff from heuristics
    detection = llm_detection
    detection.places_detected = heuristic_detection.places_detected
    detection.detector = ActualDetectorType.HybridLLMVar
  elif llm_type == llm_fallback.NeedLLM.ForPlace:
    # Use place stuff from LLM
    detection = heuristic_detection
    detection.places_detected = llm_detection.places_detected
    detection.detector = ActualDetectorType.HybridLLMPlace
  detection.llm_api = llm_api_type
  return detection


#
# Constructor a Detection object given DCID inputs.
#
def construct_for_explore(entities: List[str], vars: List[str], child_type: str,
                          cmp_entities: List[str], cmp_vars: List[str],
                          in_classifications: List[Dict], debug_logs: Dict,
                          counters: Counters) -> types.Detection:
  all_entities = entities + cmp_entities
  places, parent_map = place.get_place_from_dcids(all_entities, debug_logs)
  if not places:
    counters.err('failed_detection_unabletofinddcids', all_entities)
    return None, 'No places found in the query!'

  # Unused fillers.
  var_query = ';'.join(vars)
  place_query = ';'.join(entities)
  query = var_query + (f' {child_type} ' if child_type else ' ') + place_query

  classifications = []

  # For place-comparison (bar charts only), we don't need child places.
  # So we can save on the existence checks, etc.
  had_default_type = False
  if not cmp_entities:
    if child_type:
      if not any([child_type == x.value for x in types.ContainedInPlaceType]):
        counters.err('failed_detection_badChildEntityType', child_type)
        return None, f'Bad childEntityType value {child_type}!'
      child_type = types.ContainedInPlaceType(child_type)
    if not child_type or child_type == types.ContainedInPlaceType.DEFAULT_TYPE:
      child_type = utils.get_default_child_place_type(places[0])
      had_default_type = True
  else:
    child_type = None
  if child_type:
    # This is important so that the child places correspond to AA1/AA2 regardless
    # of what the user has asked for (district, state)
    child_type = utils.admin_area_equiv_for_place(child_type, places[0])
    c = types.NLClassifier(type=types.ClassificationType.CONTAINED_IN,
                           attributes=types.ContainedInClassificationAttributes(
                               contained_in_place_type=child_type,
                               had_default_type=had_default_type))
    classifications.append(c)

  if cmp_entities:
    c = types.NLClassifier(type=types.ClassificationType.COMPARISON,
                           attributes=types.ComparisonClassificationAttributes(
                               comparison_trigger_words=[]))
    classifications.append(c)
  elif cmp_vars:
    c = types.NLClassifier(type=types.ClassificationType.CORRELATION,
                           attributes=types.ComparisonClassificationAttributes(
                               comparison_trigger_words=[]))
    classifications.append(c)

  # Append the classifications we got, but after trimming the ones above.
  classifications.extend(
      utils.trim_classifications(
          serialize.dict_to_classification(in_classifications),
          set([
              types.ClassificationType.CONTAINED_IN,
              types.ClassificationType.COMPARISON,
              types.ClassificationType.CORRELATION
          ])))

  main_dcid = places[0].dcid
  place_detection = PlaceDetection(query_original=query,
                                   query_without_place_substr=var_query,
                                   query_places_mentioned=all_entities,
                                   places_found=places,
                                   main_place=places[0],
                                   parent_places=parent_map.get(main_dcid, []),
                                   peer_places=[],
                                   child_places=[],
                                   entities_found=[],
                                   query_entities_mentioned=[])
  add_child_and_peer_places(places, child_type, counters, place_detection)
  if not cmp_entities and cmp_vars:
    # Multi SV case.
    sv_detection = types.SVDetection(query='',
                                     single_sv=dutils.VarCandidates(
                                         svs=vars,
                                         scores=[0.51] * len(vars),
                                         sv2sentences={}),
                                     prop=empty_var_candidates(),
                                     multi_sv=get_multi_sv(vars, cmp_vars, 1.0))
  else:
    sv_detection = types.SVDetection(query='',
                                     single_sv=dutils.VarCandidates(
                                         svs=vars,
                                         scores=[1.0] * len(vars),
                                         sv2sentences={}),
                                     prop=empty_var_candidates(),
                                     multi_sv=None)
  return types.Detection(original_query=query,
                         cleaned_query=query,
                         places_detected=place_detection,
                         svs_detected=sv_detection,
                         classifications=classifications,
                         detector=ActualDetectorType.NOP), None


# In this flow, we already have the Utterance with detection, just set it up
# for explore flow.  This involves:
# (1) Setting default child-type.
# (2) Setting child and peer places.
def setup_for_explore(uttr: Utterance):
  if not uttr.places:
    return
  main_place = uttr.places[0]

  had_default_type = False
  child_type = utils.get_contained_in_type(uttr)
  if not child_type or child_type == types.ContainedInPlaceType.DEFAULT_TYPE:
    child_type = utils.get_default_child_place_type(main_place)
    had_default_type = True

  if child_type:
    # This is important so that the child places correspond to AA1/AA2 regardless
    # of what the user has asked for (district, state)
    child_type = utils.admin_area_equiv_for_place(child_type, main_place)
    cls = [
        types.NLClassifier(type=types.ClassificationType.CONTAINED_IN,
                           attributes=types.ContainedInClassificationAttributes(
                               contained_in_place_type=child_type,
                               had_default_type=had_default_type))
    ]
    cls.extend(
        utils.trim_classifications(uttr.classifications,
                                   set([types.ClassificationType.CONTAINED_IN
                                       ])))
    uttr.classifications = cls

  add_child_and_peer_places(uttr.places, child_type, uttr.counters,
                            uttr.detection.places_detected)


def add_child_and_peer_places(places: List[types.Place],
                              child_type: types.ContainedInPlaceType,
                              counters: Counters, detection: PlaceDetection):
  if not places or len(places) > 1:
    return

  main_dcid = places[0].dcid
  child_places = []
  if child_type and child_type.value != places[0].place_type:
    detection.child_place_type = child_type.value
    try:
      child_places = utils.get_all_child_places(main_dcid, child_type.value,
                                                counters)
      detection.child_places = child_places[:MAX_CHILD_LIMIT]
    except Exception as e:
      detection.child_places = []
      counters.err('failed_child_places_fetch', str(e))

  detection.peer_places = get_similar(places[0])
