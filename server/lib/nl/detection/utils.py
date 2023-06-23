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

from typing import List

from server.lib.nl.common import constants
from server.lib.nl.common import counters as ctr
from server.lib.nl.detection.types import Detection
from shared.lib import constants as shared_constants
from shared.lib import detected_variables as vars

# We will ignore SV detections that are below this threshold
_SV_THRESHOLD = 0.5


#
# Filter out SVs that are below a score.
#
def filter_svs(sv: vars.VarCandidates, counters: ctr.Counters) -> List[str]:
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


def has_dual_sv(detection: Detection) -> bool:
  if not is_multi_sv(detection):
    return False
  for c in detection.svs_detected.multi_sv.candidates:
    if len(c.parts) == 2:
      return True
  return False