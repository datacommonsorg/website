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

from typing import Callable, Dict, List

import shared.lib.detected_variables as vars

# Given a list of query <-> candidates pairs as input, returns
# a corresponding list of scores.
RerankCallable = Callable[[List[tuple[str, str]]], List[float]]


def rerank(rerank_fn: RerankCallable, query: str,
           candidates: vars.VarCandidates,
           debug_logs: Dict) -> vars.VarCandidates:
  # TODO: Implement me
  return candidates
