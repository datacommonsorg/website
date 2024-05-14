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

from shared.lib import constants


@dataclass
class SentenceScore:
  sentence: str
  score: float
  rerank_score: float = None

  def to_dict(self) -> Dict:
    d = {'sentence': self.sentence, 'score': self.score}
    if self.rerank_score != None:
      d['rerank_score'] = self.rerank_score
    return d


# Key is SV.
SV2Sentences = Dict[str, List[SentenceScore]]


# List of SV candidates, along with scores.
@dataclass
class VarCandidates:
  # The below are sorted and parallel lists.
  svs: List[str]
  scores: List[float]
  # Key is variable.
  sv2sentences: SV2Sentences

  def sv2sentences_dict(self) -> Dict[str, Dict]:
    resp = {}
    for sv, sentences in self.sv2sentences.items():
      resp[sv] = [s.to_dict() for s in sentences]
    return resp


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


@dataclass
class VarDetectionResult:
  single_var: VarCandidates
  multi_var: MultiVarCandidates
  # This is the default score threshold prescribed by the model.
  model_threshold: float


def dict_to_var_candidates(nlresp: Dict) -> VarCandidates:
  sv2sentences: SV2Sentences = {}
  for sv, sentences in nlresp.get('SV_to_Sentences', {}).items():
    sv2sentences[sv] = [
        SentenceScore(sentence=v.get('sentence'),
                      score=v.get('score'),
                      rerank_score=v.get('rerank_score', None))
        for v in sentences
    ]
  return VarCandidates(svs=nlresp.get('SV', []),
                       scores=nlresp.get('CosineScore', []),
                       sv2sentences=sv2sentences)


def var_candidates_to_dict(res: VarCandidates) -> Dict:
  result = {'SV': res.svs, 'CosineScore': res.scores}
  if res.sv2sentences:
    result['SV_to_Sentences'] = res.sv2sentences_dict()
  return result


def var_detection_result_to_dict(res: VarDetectionResult) -> Dict:
  result = var_candidates_to_dict(res.single_var)
  if res.multi_var:
    result['MultiSV'] = multivar_candidates_to_dict(res.multi_var)
  return result


# Only used in test
def test_dict_to_var_detection_result(input: Dict) -> VarDetectionResult:
  return VarDetectionResult(
      single_var=dict_to_var_candidates(input),
      multi_var=dict_to_multivar_candidates(input.get('MultiSV', {})),
      model_threshold=constants.SV_SCORE_DEFAULT_THRESHOLD)


def multivar_candidates_to_dict(candidates: MultiVarCandidates) -> Dict:
  if not candidates or not candidates.candidates:
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


# Deduplicates SVs across different parts of the given multi-var candidate.
# If a part has no SV as a result, returns False.
def deduplicate_svs(candidate: MultiVarCandidate) -> bool:
  exists = set()

  for p in candidate.parts:
    new_svs = []
    new_scores = []

    for sv, score in zip(p.svs, p.scores):
      if sv in exists:
        continue
      exists.add(sv)
      new_svs.append(sv)
      new_scores.append(score)

    if not new_svs:
      return False

    p.svs = new_svs
    p.scores = new_scores

  return True
