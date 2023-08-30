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

from typing import Dict, List

from server.lib.nl.common import constants
from server.lib.nl.common import counters as ctr
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection
from shared.lib import constants as shared_constants
from shared.lib import detected_variables as dvars

# We will ignore SV detections that are below this threshold
_SV_THRESHOLD = 0.5


#
# Filter out SVs that are below a score.
#
def filter_svs(sv: dvars.VarCandidates, counters: ctr.Counters) -> List[str]:
  i = 0
  ans = []
  blocked_vars = set()
  while (i < len(sv.svs)):
    if (sv.scores[i] >= _SV_THRESHOLD):
      var = sv.svs[i]

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
  parts: List[dvars.MultiVarCandidatePart] = None
  for c in detection.svs_detected.multi_sv.candidates:
    if len(c.parts) == 2:
      parts = c.parts
      break
  return parts


def get_top_sv_score(detection: Detection) -> float:
  if is_multi_sv(detection):
    return detection.svs_detected.multi_sv.candidates[0].aggregate_score
  elif detection.svs_detected.single_sv and detection.svs_detected.single_sv.scores:
    return detection.svs_detected.single_sv.scores[0]
  return 0


def empty_svs_score_dict():
  return {"SV": [], "CosineScore": [], "SV_to_Sentences": {}, "MultiSV": {}}


def create_sv_detection(query: str, svs_scores_dict: Dict) -> SVDetection:
  return SVDetection(query=query,
                     single_sv=dvars.VarCandidates(
                         svs=svs_scores_dict['SV'],
                         scores=svs_scores_dict['CosineScore'],
                         sv2sentences=svs_scores_dict['SV_to_Sentences']),
                     multi_sv=dvars.dict_to_multivar_candidates(
                         svs_scores_dict['MultiSV']))


def empty_place_detection() -> PlaceDetection:
  return PlaceDetection(query_original='',
                        query_without_place_substr='',
                        query_places_mentioned=[],
                        places_found=[],
                        main_place=None)


def create_utterance(query_detection: Detection, currentUtterance: Utterance,
                     counters: ctr.Counters, session_id: str) -> Utterance:
  filtered_svs = filter_svs(query_detection.svs_detected.single_sv, counters)

  # Construct Utterance datastructure.
  uttr = Utterance(prev_utterance=currentUtterance,
                   query=query_detection.original_query,
                   query_type=QueryType.UNKNOWN,
                   detection=query_detection,
                   places=[],
                   classifications=query_detection.classifications,
                   svs=filtered_svs,
                   chartCandidates=[],
                   rankedCharts=[],
                   answerPlaces=[],
                   counters=counters,
                   session_id=session_id,
                   multi_svs=query_detection.svs_detected.multi_sv,
                   llm_resp=query_detection.llm_resp)
  uttr.counters.info('filtered_svs', filtered_svs)

  # Add detected places.
  if (query_detection.places_detected) and (
      query_detection.places_detected.places_found):
    uttr.places.extend(query_detection.places_detected.places_found)

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