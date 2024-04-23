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

from itertools import chain
from typing import Dict, List

from nl_server.embeddings import EmbeddingsResult
from nl_server.embeddings import SearchVarsResult


# This function merges the lists and sorts by score.
#
# Note that the resulting list can have multiple entries for the
# same "sentence", and for the same variable.  This will get grouped
# by variable, and re-ranked downstream (refer `_rank_vars`).
def merge_search_results(inputs: List[SearchVarsResult]) -> SearchVarsResult:
  if len(inputs) == 1:
    # No merging necessary, this is the Base DC case.
    return inputs[0]

  # Group by query first.
  query_grouping: Dict[str, List[EmbeddingsResult]] = {}
  for input in inputs:
    for query, emb_result in input.items():
      if query not in query_grouping:
        query_grouping[query] = []
      query_grouping[query].append(emb_result)

  # Merge each query group.
  result: SearchVarsResult = {}
  for query, emb_result in query_grouping.items():
    result[query] = _merge_search_results_for_one_query(emb_result)

  return result


def _merge_search_results_for_one_query(
    inputs: List[EmbeddingsResult]) -> EmbeddingsResult:
  # Given the inputs are sorted, this maybe a bit less efficient than
  # merge sort, but lets the library do the sorting.
  flattened_list = chain.from_iterable(inputs)
  return sorted(flattened_list, key=lambda x: x.score, reverse=True)
