# Copyright 2024 Google LLC
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

# This module implements an
# https://en.wikipedia.org/wiki/Discounted_cumulative_gain metric to score
# ranked stat vars compared with a golden list.

import math


def _calculate_relevance_scores(baseline_list):
  num_tokens = len(baseline_list)
  return {token: num_tokens - i for i, token in enumerate(baseline_list)}


def dcg(scores, k=None):
  if k is None:
    k = len(scores)
  # https://en.wikipedia.org/wiki/Discounted_cumulative_gain
  return sum((2**score - 1) / math.log(idx + 2, 2)
             for idx, score in enumerate(scores[:k]))


def ndcg(new_list, baseline_list):
  relevance_scores = _calculate_relevance_scores(baseline_list)
  new_scores = [relevance_scores.get(token, 0) for token in new_list]
  baseline_scores = [relevance_scores[token] for token in baseline_list]
  dcg_new = dcg(new_scores)
  dcg_base = dcg(baseline_scores)
  return dcg_new / dcg_base if dcg_base > 0 else 0


def accuracy(new_list, baseline_list):
  new_list = new_list[:len(baseline_list)]
  return len(set(new_list) & set(baseline_list)) / len(baseline_list)
