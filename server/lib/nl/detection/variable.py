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
#
# Interface for variable detection
#

from typing import Dict, List

import server.lib.nl.common.counters as ctr
from server.lib.nl.detection import query_util
from server.lib.nl.detection.types import DetectionArgs
import server.lib.nl.detection.utils as dutils
from server.lib.nl.explore import params
from server.services import datacommons as dc
from shared.lib import constants
import shared.lib.detected_variables as vars
import shared.lib.utils as shared_utils

# TODO: decouple words removal from detected attributes. Today, the removal
# blanket removes anything that matches, including the various attribute/
# classification triggers and contained_in place types (and their plurals).
# This may not always be the best thing to do.
ALL_STOP_WORDS = shared_utils.combine_stop_words()

# A value higher than the highest score.
_HIGHEST_SCORE = 1.0
_INIT_SCORE = (_HIGHEST_SCORE + 0.1)

_NUM_CANDIDATES_PER_NSPLIT = 3

_MAX_MULTIVAR_PARTS = 2


#
# The main entry point into SV detection. Given a query (with places removed)
# calls the NL Server and returns a dict with both single-SV and multi-SV
# (if relevant) detections.  For more details see create_sv_detection().
#
def detect_vars(orig_query: str, debug_logs: Dict,
                dargs: DetectionArgs) -> vars.VarDetectionResult:
  #
  # 1. Prepare all the queries for embeddings lookup, both mono-var and multi-var.
  #
  # Remove all stop-words only for mono-var query.
  # Check comment at the top of this file above `ALL_STOP_WORDS` to understand
  # the potential areas for improvement. For now, this removal blanket removes
  # any words in ALL_STOP_WORDS which includes contained_in places and their
  # plurals and any other query attribution/classification trigger words.
  if dargs.include_stop_words:
    query_monovar = orig_query
  else:
    query_monovar = shared_utils.remove_stop_words(orig_query,
                                                   query_util.ALL_STOP_WORDS)
  if not query_monovar.strip():
    # Empty user query!  Return empty results
    return dutils.empty_var_detection_result()
  all_queries = [query_monovar]

  # Try to detect multiple SVs.  Use the original query so that
  # the logic can rely on stop-words like `vs`, `and`, etc as hints
  # for SV delimiters.
  multi_querysets, multi_queries = _prepare_multivar_queries(orig_query)
  all_queries.extend(multi_queries)

  #
  # 2. Lookup embeddings with both single-var and multi-var queries.
  #
  # Make API call to the NL models/embeddings server.
  resp = dc.nl_search_vars(all_queries, dargs.embeddings_index_types, False,
                           dargs.reranker)
  query2results = {
      q: vars.dict_to_var_candidates(r) for q, r in resp['queryResults'].items()
  }
  debug_logs.update(resp.get('debugLogs', {}))
  model_threshold = resp['scoreThreshold']

  #
  # 3. Prepare result candidates.
  #
  # If caller had an overriden threshold bump, apply that.
  threshold_override = params.sv_threshold_override(dargs)
  multi_var_threshold = dutils.compute_final_threshold(model_threshold,
                                                       threshold_override)
  result_monovar = query2results[query_monovar]
  result_multivar = _prepare_multivar_candidates(multi_querysets, query2results,
                                                 multi_var_threshold)

  debug_logs["sv_detection_query_input"] = orig_query
  debug_logs["sv_detection_query_stop_words_removal"] = query_monovar
  return vars.VarDetectionResult(single_var=result_monovar,
                                 multi_var=result_multivar,
                                 model_threshold=model_threshold)


#
# Detects one or more SVs from the query.
# TODO: Fix the query upstream to ensure the punctuations aren't stripped.
#
def _prepare_multivar_queries(
    query: str) -> tuple[List[query_util.QuerySet], List[str]]:
  #
  # Prepare a combination of query-sets.
  #
  querysets = query_util.prepare_multivar_querysets(query,
                                                    max_svs=_MAX_MULTIVAR_PARTS)

  # Make a unique list of query strings
  all_queries = set()
  for qs in querysets:
    for c in qs.combinations:
      for p in c.parts:
        all_queries.add(p)

  return querysets, list(all_queries)


def _prepare_multivar_candidates(querysets: List[query_util.QuerySet],
                                 query2result: Dict[str, vars.VarCandidates],
                                 threshold: float) -> vars.MultiVarCandidates:
  result = vars.MultiVarCandidates(candidates=[])
  #
  # A queryset is the set of all combinations of query
  # splits of a given length. For example, a query like
  # "hispanic women phd" may have a queryset for a
  # 2-way split, like:
  #   QuerySet(nsplits=2,
  #            combinations=[
  #               ['hispanic women', 'phd'],
  #               ['hispanic', 'women phd'],
  #             ])
  # The 3-way split has only one combination.
  #
  # We take the average score from the top SV from the query-parts in a
  # queryset (ignoring any queryset with a score below threshold). Then
  # sort all candidates by that score.
  #
  # TODO: Come up with a better ranking function.
  #
  for qs in querysets:
    candidates: List[vars.MultiVarCandidate] = []
    for c in qs.combinations:
      if not c or not c.parts:
        continue

      total = 0
      candidate = vars.MultiVarCandidate(parts=[],
                                         delim_based=qs.delim_based,
                                         aggregate_score=-1)
      lowest = _INIT_SCORE
      for q in c.parts:
        r = query2result.get(
            q, vars.VarCandidates(svs=[], scores=[], sv2sentences={}))
        part = vars.MultiVarCandidatePart(query_part=q, svs=[], scores=[])
        score = 0
        if r.svs:
          # Pick the top-K SVs.
          limit = _pick_top_k(r)
          if limit > 0:
            part.svs = r.svs[:limit]
            part.scores = [s for s in r.scores[:limit]]
            score = r.scores[0]

        if score < lowest:
          lowest = score
        total += score
        candidate.parts.append(part)

      if lowest < threshold:
        # A query-part's best SV did not cross our score threshold,
        # so drop this candidate.
        continue

      # Avoid duplicate SVs across candidate parts.
      if not vars.deduplicate_svs(candidate):
        continue

      # The candidate level score is the average.
      candidate.aggregate_score = total / len(c.parts)
      candidates.append(candidate)

    if candidates:
      # Pick the top candidate.
      candidates.sort(key=lambda c: c.aggregate_score, reverse=True)
      # Pick upto some number of candidates.  Could be just 1
      # eventually.
      result.candidates.extend(candidates[:_NUM_CANDIDATES_PER_NSPLIT])

  # Sort the results by score.
  result.candidates.sort(key=lambda c: c.aggregate_score, reverse=True)
  return result


#
# Given a list of variables select only those SVs that do not deviate
# from the best SV by more than a certain threshold.
#
def _pick_top_k(candidates: vars.VarCandidates) -> int:
  k = 1
  first = candidates.scores[0]
  for i in range(1, len(candidates.scores)):
    if first - candidates.scores[i] > constants.MULTI_SV_SCORE_DIFFERENTIAL:
      break
    k += 1
  return k
