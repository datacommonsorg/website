# copyright 2024 google llc
#
# licensed under the apache license, version 2.0 (the "license");
# you may not use this file except in compliance with the license.
# you may obtain a copy of the license at
#
#      http://www.apache.org/licenses/license-2.0
#
# unless required by applicable law or agreed to in writing, software
# distributed under the license is distributed on an "as is" basis,
# without warranties or conditions of any kind, either express or implied.
# see the license for the specific language governing permissions and
# limitations under the license.

from typing import Dict, List

from nl_server.embeddings import EmbeddingsMatch
from nl_server.embeddings import EmbeddingsResult
from nl_server.embeddings import SearchVarsResult


# NOTE: The merge
def merge_search_results(inputs: List[SearchVarsResult]) -> SearchVarsResult:

  # Group by query first.
  query_grouping: Dict[str, List[EmbeddingsResult]] = {}
  for input in inputs:
    for query, emb_result in input.items():
      if query not in query_grouping:
        query_grouping[query] = []
      query_grouping[query].append(emb_result)

  # Merge each query group.
  result: List[SearchVarsResult] = {}
  for query, emb_result in query_grouping.items():
    result[query] = _merge_search_results_for_one_query(emb_result)

  return result


def _merge_search_results_for_one_query(
    inputs: List[EmbeddingsResult]) -> EmbeddingsResult:
  # A parallel array for each of the inputs, to identify
  # the index of the next match to evaulate, tracking
  # progress in the "merge sort".
  matches_idx = [0] * len(inputs)

  result: List[EmbeddingsMatch] = []
  while True:
    # Find the idx corresponding to the max score, among
    # the valid indexes found in `matches_idx`
    max_idx = -1
    max_score = -1
    for i, midx in enumerate(matches_idx):
      if midx < len(inputs[i]):
        score = inputs[i][midx].score
        if score > max_score:
          max_idx = i
          max_score = score

    # If we found no valid idx, then we've exhausted all
    # the matches in all the inputs.
    if max_idx == -1:
      break

    # In the input identified by |max_idx|, add the match
    # identified by matches_idx[max_idx]
    result.append(inputs[max_idx][matches_idx[max_idx]])

    # Mark the match as processed.
    matches_idx[max_idx] += 1

  return result
