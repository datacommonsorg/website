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
"""Module for Explore existence checks."""

from dataclasses import dataclass
from typing import List

import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.types as ftypes


@dataclass
class ExistenceResult:
  exist_svs: List[str]
  is_single_point: bool = False


# Returns subset of SVs which exist in given place.
def svs4place(state: ftypes.PopulateState, place: dtypes.Place,
              svs: List[str]) -> ExistenceResult:
  # Main SV existence checks.
  exist_svs = [sv for sv in svs if place.dcid in state.exist_checks.get(sv, {})]
  is_single_point = False
  if exist_svs:
    # If any of them has single-point
    is_single_point = any(
        [state.exist_checks[sv][place.dcid] for sv in exist_svs])

  return ExistenceResult(exist_svs, is_single_point)


# Return subset of SVs which exist in children places.
def svs4children(state: ftypes.PopulateState, place: dtypes.Place,
                 svs: List[str]) -> ExistenceResult:
  # Child existence check
  place_key = place.dcid + state.place_type.value
  exist_svs = [sv for sv in svs if place_key in state.exist_checks.get(sv, {})]
  return ExistenceResult(exist_svs)
