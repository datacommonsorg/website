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
"""Data structures for representing SVs detected in queries."""

from dataclasses import dataclass
from typing import Dict, List


# List of SV candidates, along with scores.
@dataclass
class VarCandidates:
  # The below are sorted and parallel lists.
  svs: List[str]
  scores: List[float]
  sv2sentences: Dict[str, List[str]]


# One part of a single multi-var candidate and its
# associated SVs and scores.
@dataclass
class MultiVarCandidatePart:
  query_part: str
  svs: List[str]
  scores: List[float]


# One multi-var candidate containing multiple parts.
@dataclass
class MultiVarCandidate:
  parts: List[MultiVarCandidatePart]
  # Aggregate score
  aggregate_score: float
  # Is this candidate based on a split computed from delimiters?
  delim_based: bool


# List of multi-var candidates.
@dataclass
class MultiVarCandidates:
  candidates: List[MultiVarCandidate]


def multivar_candidates_to_dict(candidates: MultiVarCandidates) -> Dict:
  if not candidates:
    return {}
  result = {'Candidates': []}
  for c in candidates.candidates:
    c_dict = {
        'Parts': [],
        'AggCosineScore': round(c.aggregate_score, 4),
        'DelimBased': c.delim_based,
    }
    for p in c.parts:
      p_dict = {'QueryPart': p.query_part, 'SV': p.svs, 'CosineScore': p.scores}
      c_dict['Parts'].append(p_dict)
    result['Candidates'].append(c_dict)
  return result


def dict_to_multivar_candidates(input: Dict) -> MultiVarCandidates:
  if not input:
    return None
  result = MultiVarCandidates(candidates=[])
  for c_dict in input.get('Candidates', []):
    if 'AggCosineScore' not in c_dict:
      continue
    parts: List[MultiVarCandidatePart] = []
    for p_dict in c_dict.get('Parts', []):
      parts.append(
          MultiVarCandidatePart(query_part=p_dict['QueryPart'],
                                svs=p_dict['SV'],
                                scores=p_dict['CosineScore']))
    if parts:
      result.candidates.append(
          MultiVarCandidate(parts=parts,
                            aggregate_score=c_dict['AggCosineScore'],
                            delim_based=c_dict['DelimBased']))
  return result
