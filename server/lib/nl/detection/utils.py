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
"""Detector helper utils."""

# TODO: rename to variable_utils.py

import re
from typing import Dict, List

from server.lib.fetch import property_values
from server.lib.nl.common import constants
from server.lib.nl.common import counters as ctr
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection
from server.lib.nl.explore.params import QueryMode
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartType
from shared.lib import constants as shared_constants
from shared.lib import detected_variables as dvars


#
# Filter out SVs that are below a score.
#
def filter_svs(candidates: dvars.VarCandidates, threshold: float,
               counters: ctr.Counters) -> List[str]:
  i = 0
  ans = []
  blocked_vars = set()
  while i < len(candidates.svs):
    if candidates.scores[i] >= threshold:
      var = candidates.svs[i]

      # Check if an earlier var blocks this var.
      if var in blocked_vars:
        counters.info("blocked_vars", var)
        i += 1
        continue
      ans.append(var)

      # If this var should block some vars,
      # add them to the blocked_vars set.
      if var in constants.SV_BLOCKS_MAP:
        blocked_vars.update(constants.SV_BLOCKS_MAP[var])
    i += 1
  return ans


# Returns true if the score of multi-sv detection exceeds the single
# SV detection.
def is_multi_sv(detection: Detection) -> bool:
  single_sv = detection.svs_detected.single_sv
  multi_sv = detection.svs_detected.multi_sv
  if (not single_sv or not single_sv.scores or not multi_sv or
      not multi_sv.candidates):
    return False
  # Get the top single-sv and multi-sv scores.
  top_sv_score = single_sv.scores[0]
  top_multi_sv_score = multi_sv.candidates[0].aggregate_score

  # Prefer multi-sv when the scores are higher or up to a score differential.
  if (top_multi_sv_score > top_sv_score or top_sv_score - top_multi_sv_score
      <= shared_constants.MULTI_SV_SCORE_DIFFERENTIAL):
    return True
  return False


# Returns true if detection has a multi-sv candidate with 2 parts.
def has_dual_sv(detection: Detection) -> bool:
  if not is_multi_sv(detection):
    return False
  for c in detection.svs_detected.multi_sv.candidates:
    if len(c.parts) == 2:
      return True
  return False


def get_multi_sv_pair(
    detection: Detection) -> List[dvars.MultiVarCandidatePart]:
  parts: List[dvars.MultiVarCandidatePart] = []
  for c in detection.svs_detected.multi_sv.candidates:
    if len(c.parts) == 2:
      parts = c.parts
      break
  return parts


# Gets the SV score of the first chart in chart_specs
def get_top_sv_score(detection: Detection, cspec: ChartSpec) -> float:
  # Note that we look for the detected SVs in the `orig_sv_map` field
  # of the chart_vars, since the svs directly in ChartSpec or ChartVars
  # can be the opened SVs from a topic.
  if cspec.chart_type == ChartType.SCATTER_CHART and len(
      cspec.chart_vars.orig_sv_map) == 2:
    # Look for chart-var in multi-sv
    cs_svs = cspec.chart_vars.orig_sv_map
    score = -1
    for p in get_multi_sv_pair(detection):
      for idx, sv in enumerate(p.svs):
        if sv in cs_svs:
          if score == -1 or p.scores[idx] < score:
            score = p.scores[idx]
          break
    if score != -1:
      return score
  elif cspec.svs and detection.svs_detected.single_sv:
    # Look for chart-var in single-sv
    for idx, sv in enumerate(detection.svs_detected.single_sv.svs):
      if sv in cspec.chart_vars.orig_sv_map:
        return detection.svs_detected.single_sv.scores[idx]

  # Fallback return the first SV score.
  if detection.svs_detected.single_sv:
    return detection.svs_detected.single_sv.scores[0]
  return 0


def empty_var_detection_result() -> dvars.VarDetectionResult:
  return dvars.VarDetectionResult(
      single_var=empty_var_candidates(),
      multi_var=dvars.MultiVarCandidates(candidates=[]),
      model_threshold=shared_constants.SV_SCORE_DEFAULT_THRESHOLD)


def empty_var_candidates():
  return dvars.VarCandidates(svs=[], scores=[], sv2sentences={})


# Takes the detected svs and returns
# 1. sv candidates: svs that are Statistical Variable or Topic
# 2. prop candidates: any other detected svs.
def _get_sv_and_prop_candidates(
    var_detection_result: dvars.VarDetectionResult,
    allow_triples: bool = False
) -> tuple[dvars.VarCandidates, dvars.VarCandidates]:
  sv_candidates = empty_var_candidates()
  prop_candidates = empty_var_candidates()
  if not allow_triples:
    # If triples are not allowed, assume all detected svs are sv type
    sv_candidates = var_detection_result.single_var
    return sv_candidates, prop_candidates

  svar_result = var_detection_result.single_var

  sv_types = property_values(svar_result.svs, 'typeOf')
  for i, sv in enumerate(svar_result.svs):
    sv_type_list = sv_types.get(sv, [])
    # an sv is considered an sv if any of its types are Statistical Variable or
    # Topic. We want to check if an sv is type Statistical Variable or Topic
    # because we are adding properties that aren't actually properties but
    # indicate a link using ->.
    is_sv = False
    # We have some curated topics that are not a node in the kg, so assume topic
    # if the sv starts with dc/topic
    if sv.startswith('dc/topic/'):
      is_sv = True
    for sv_type in sv_type_list:
      if sv_type in ['StatisticalVariable', 'Topic']:
        is_sv = True
        break
    candidate_to_add = sv_candidates if is_sv else prop_candidates
    candidate_to_add.svs.append(sv)
    candidate_to_add.scores.append(svar_result.scores[i])
    candidate_to_add.sv2sentences[sv] = svar_result.sv2sentences.get(sv, [])
  return sv_candidates, prop_candidates


def compute_final_threshold(model_threshold: float,
                            threshold_override: float) -> float:
  # Pick the higher of the two.
  return max(model_threshold, threshold_override)


def create_sv_detection(query: str,
                        var_detection_result: dvars.VarDetectionResult,
                        sv_threshold_override: float = 0,
                        allow_triples: bool = False) -> SVDetection:
  sv_candidates, prop_candidates = _get_sv_and_prop_candidates(
      var_detection_result, allow_triples)

  sv_threshold = compute_final_threshold(var_detection_result.model_threshold,
                                         sv_threshold_override)
  return SVDetection(query=query,
                     single_sv=sv_candidates,
                     multi_sv=var_detection_result.multi_var,
                     prop=prop_candidates,
                     sv_threshold=sv_threshold,
                     model_threshold=var_detection_result.model_threshold)


def empty_place_detection() -> PlaceDetection:
  return PlaceDetection(query_original='',
                        query_without_place_substr='',
                        query_places_mentioned=[],
                        places_found=[],
                        main_place=None,
                        entities_found=[],
                        query_entities_mentioned=[])


def create_utterance(query_detection: Detection,
                     currentUtterance: Utterance,
                     counters: ctr.Counters,
                     session_id: str,
                     test: str = '',
                     client: str = '',
                     mode: QueryMode = None) -> Utterance:
  filtered_svs = filter_svs(query_detection.svs_detected.single_sv,
                            query_detection.svs_detected.sv_threshold, counters)
  # Treat detected variables that are not Statistical Variable or Topic as
  # properties.
  filtered_properties = filter_svs(query_detection.svs_detected.prop,
                                   query_detection.svs_detected.sv_threshold,
                                   counters)

  # Construct Utterance datastructure.
  uttr = Utterance(prev_utterance=currentUtterance,
                   query=query_detection.original_query,
                   query_type=QueryType.UNKNOWN,
                   detection=query_detection,
                   places=[],
                   classifications=query_detection.classifications,
                   svs=filtered_svs,
                   properties=filtered_properties,
                   chartCandidates=[],
                   rankedCharts=[],
                   answerPlaces=[],
                   counters=counters,
                   session_id=session_id,
                   multi_svs=query_detection.svs_detected.multi_sv,
                   llm_resp=query_detection.llm_resp,
                   test=test,
                   client=client,
                   mode=mode,
                   entities=[])
  uttr.counters.info('filtered_svs', filtered_svs)

  # Add detected places.
  if (query_detection.places_detected):
    if (query_detection.places_detected.places_found):
      uttr.places.extend(query_detection.places_detected.places_found)
    if (query_detection.places_detected.entities_found):
      uttr.entities.extend(query_detection.places_detected.entities_found)

  return uttr


def get_multi_sv(main_vars: List[str], cmp_vars: List[str],
                 score: float) -> dvars.MultiVarCandidates:
  res = dvars.MultiVarCandidates(candidates=[
      dvars.MultiVarCandidate(parts=[
          dvars.MultiVarCandidatePart(
              query_part='var1', svs=main_vars, scores=[score] *
              len(main_vars)),
          dvars.MultiVarCandidatePart(
              query_part='var2', svs=cmp_vars, scores=[score] * len(cmp_vars))
      ],
                              aggregate_score=score,
                              delim_based=True)
  ])
  if not dvars.deduplicate_svs(res.candidates[0]):
    return None
  return res


# Removes the string that triggered date classification from the query string.
def remove_date_from_query(query: str,
                           classifications: List[NLClassifier]) -> str:
  processed_query = query
  for cl in classifications:
    if cl.type != ClassificationType.DATE or not cl.attributes.date_trigger_strings:
      continue
    # Remove the date trigger string from the query.
    date_trigger = cl.attributes.date_trigger_strings[0]
    processed_query = processed_query.replace(date_trigger, "", 1)
  return processed_query


def is_llm_detection(d: Detection) -> bool:
  return d.detector in [
      ActualDetectorType.LLM, ActualDetectorType.HybridLLMFull
  ]


# Find "needle" at word boundary in "haystack".
def find_word_boundary(haystack: str, needle: str):
  # Create a regex pattern with word boundaries
  pattern = r'\b' + re.escape(needle) + r'\b'
  # Search for the pattern in the string
  match = re.search(pattern, haystack)
  # Return the start index if a match is found, otherwise -1
  if match:
    return match.start()
  return -1


# Replaces strings in a query given a dictionary where key is the original
# string and value is the replacement string to use
def replace_strings_in_query(query: str, replacements: Dict[str, str]) -> str:
  processed_query = query
  for orig, new in replacements.items():
    processed_query = re.sub(rf"\b{orig}\b", new, processed_query)
  return processed_query