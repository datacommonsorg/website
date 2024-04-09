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
"""Helper logic for Embeddings."""

from typing import List

from shared.lib.detected_variables import VarCandidates

# Number of matches to find within the SV index.
_NUM_SV_INDEX_MATCHES = 40
# Number of matches to find within the SV index if skipping topics.
_NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS = 60

# Prefix string for dcids that are topics
_TOPIC_PREFIX = 'dc/topic/'


def get_topk(skip_topics: bool) -> int:
  if skip_topics:
    return _NUM_SV_INDEX_MATCHES_WITHOUT_TOPICS
  return _NUM_SV_INDEX_MATCHES


def trim_topics(pre_trim: List[VarCandidates]) -> List[VarCandidates]:
  # Drop the topics from the results.
  post_trim = []
  for pre in pre_trim:
    post = VarCandidates(svs=[], scores=[], sv2sentences={})
    for i, sv in enumerate(pre.svs):
      if not sv.startswith(_TOPIC_PREFIX):
        post.svs.append(sv)
        post.scores.append(pre.scores[i])
        post.sv2sentences[sv] = pre.sv2sentences[sv]
    post_trim.append(post)
  return post_trim
