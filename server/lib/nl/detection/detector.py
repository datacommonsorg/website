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
from markupsafe import escape

from server.lib.nl.common import utils
from server.lib.nl.common.counters import Counters
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection import heuristic_detector
from server.lib.nl.detection import llm_detector
from server.lib.nl.detection import llm_fallback
from server.lib.nl.detection import place
from server.lib.nl.detection import types
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import PlaceDetectorType
from server.lib.nl.detection.types import RequestedDetectorType
import shared.lib.detected_variables as dutils

_PALM_API_DETECTORS = [
    RequestedDetectorType.LLM.value,
    RequestedDetectorType.Hybrid.value,
]

MAX_CHILD_LIMIT = 50


#
# The main function that routes across Heuristic and LLM detectors.
#
# For `hybrid` detection, it first calls Heuristic detector, and
# based on `need_llm()`, decides to call the LLM detector.
#
def detect(detector_type: str, place_detector_type: PlaceDetectorType,
           original_query: str, no_punct_query: str, prev_utterance: Utterance,
           embeddings_index_type: str, query_detection_debug_logs: Dict,
           counters: Counters) -> types.Detection:
  #
  # In the absence of the PALM API key, fallback to heuristic.
  #
  if (detector_type in _PALM_API_DETECTORS and
      'PALM_API_KEY' not in current_app.config):
    counters.err('failed_palm_keynotfound', '')
    detector_type = RequestedDetectorType.Heuristic.value

  #
  # LLM Detection.
  #
  if detector_type == RequestedDetectorType.LLM.value:
    llm_detection = llm_detector.detect(original_query, prev_utterance,
                                        embeddings_index_type,
                                        query_detection_debug_logs, counters)
    return llm_detection

  #
  # Heuristic detection.
  #
  heuristic_detection = heuristic_detector.detect(place_detector_type,
                                                  str(escape(original_query)),
                                                  no_punct_query,
                                                  embeddings_index_type,
                                                  query_detection_debug_logs,
                                                  counters)
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
  llm_detection = llm_detector.detect(original_query, prev_utterance,
                                      embeddings_index_type,
                                      query_detection_debug_logs, counters)

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

  return detection


#
# Constructor a Detection object given DCID inputs.
#
def construct(entities: List[str], vars: List[str], child_type: str,
              cmp_entities: List[str], cmp_vars: List[str], debug_logs: Dict,
              counters: Counters) -> types.Detection:
  all_entities = entities + cmp_entities
  parent_map = {p: [] for p in all_entities}
  places = place.get_place_from_dcids(all_entities, debug_logs, parent_map)
  if not places:
    counters.err('failed_detection_unabletofinddcids', all_entities)
    return None, 'No places found!'

  # Unused fillers.
  var_query = ';'.join(vars)
  place_query = ';'.join(entities)
  query = var_query + (f' {child_type} ' if child_type else ' ') + place_query

  classifications = []

  # For place-comparison (bar charts only), we don't need child places.
  # So we can save on the existence checks, etc.
  if not cmp_entities:
    if child_type:
      if not any([child_type == x.value for x in types.ContainedInPlaceType]):
        counters.err('failed_detection_badChildEntityType', child_type)
        return None, f'Bad childEntityType value {child_type}!'
      child_type = types.ContainedInPlaceType(child_type)
    else:
      child_type = utils.get_default_child_place_type(places[0], is_nl=False)
  else:
    child_type = None
  if child_type:
    c = types.NLClassifier(type=types.ClassificationType.CONTAINED_IN,
                           attributes=types.ContainedInClassificationAttributes(
                               contained_in_place_type=child_type))
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

  main_dcid = places[0].dcid
  child_places = []
  if child_type:
    child_places = utils.get_all_child_places(main_dcid, child_type.value,
                                              counters)
    child_places = child_places[:MAX_CHILD_LIMIT]

  place_detection = PlaceDetection(query_original=query,
                                   query_without_place_substr=var_query,
                                   query_places_mentioned=all_entities,
                                   places_found=places,
                                   main_place=places[0],
                                   parent_places=parent_map.get(main_dcid, []),
                                   child_places=child_places)

  if not cmp_entities and cmp_vars:
    # Multi SV case.
    sv_detection = types.SVDetection(query='',
                                     single_sv=dutils.VarCandidates(
                                         svs=vars,
                                         scores=[0.51] * len(vars),
                                         sv2sentences={}),
                                     multi_sv=_get_multi_sv(vars, cmp_vars))
  else:
    sv_detection = types.SVDetection(query='',
                                     single_sv=dutils.VarCandidates(
                                         svs=vars,
                                         scores=[1.0] * len(vars),
                                         sv2sentences={}),
                                     multi_sv=None)
  return types.Detection(original_query=query,
                         cleaned_query=query,
                         places_detected=place_detection,
                         svs_detected=sv_detection,
                         classifications=classifications,
                         detector=ActualDetectorType.NOP,
                         place_detector=PlaceDetectorType.NOP), None


def _get_multi_sv(vars: List[str],
                  cmp_vars: List[str]) -> dutils.MultiVarCandidates:
  return dutils.MultiVarCandidates(candidates=[
      dutils.MultiVarCandidate(parts=[
          dutils.MultiVarCandidatePart(
              query_part='var1', svs=vars, scores=[1.0] * len(vars)),
          dutils.MultiVarCandidatePart(
              query_part='var2', svs=cmp_vars, scores=[1.0] * len(cmp_vars))
      ],
                               aggregate_score=1.0,
                               delim_based=True)
  ])
