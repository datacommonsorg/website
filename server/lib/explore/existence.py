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
from typing import Dict, List

from server.lib.nl.common.utils import get_place_key
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
    is_single_point = any([
        state.exist_checks[sv][place.dcid].is_single_point for sv in exist_svs
    ])

  return ExistenceResult(exist_svs, is_single_point)


# Return subset of SVs which exist in children places.
def svs4children(state: ftypes.PopulateState, place: dtypes.Place,
                 svs: List[str]) -> ExistenceResult:
  # Child existence check
  place_key = place.dcid + state.place_type.value
  exist_svs = [sv for sv in svs if place_key in state.exist_checks.get(sv, {})]
  return ExistenceResult(exist_svs)


# For a list of svs and places, Gets a map of sv -> place -> facet metadata from
# the results of an existence check
def get_sv_place_facet(
    svs: List[str], places: List[ftypes.Place],
    exist_checks: Dict[str, Dict[str,
                                 ftypes.ExistInfo]]) -> ftypes.Sv2Place2Facet:
  sv_place_facet = {}
  for sv in svs:
    sv_place_facet[sv] = {}
    for pl in places:
      sv_place_facet[sv][pl.dcid] = exist_checks.get(sv, {}).get(
          pl.dcid, ftypes.ExistInfo()).facet
  return sv_place_facet


# For a list of svs, places and an optional place type, gets a map of
# sv -> placekey -> latest valid date from the results of an existence check.
# Latest valid date is only retrieved during an existence check when there is a
# date range in the query, so if there was no date range in the query, all
# sv and placekey combinations will be mapped to empty string.
def get_sv_place_latest_date(
    svs: List[str], places: List[ftypes.Place],
    place_type: ftypes.ContainedInPlaceType,
    exist_checks: Dict[str, Dict[str,
                                 ftypes.ExistInfo]]) -> ftypes.Sv2Place2Date:
  sv_place_latest_date = {}
  for sv in svs:
    sv_place_latest_date[sv] = {}
    for pl in places:
      # Get the latest date for each place
      sv_place_latest_date[sv][pl.dcid] = exist_checks.get(sv, {}).get(
          pl.dcid, ftypes.ExistInfo()).latest_valid_date
      # If there is a place type, also get latest date for each place + place type
      if place_type:
        pl_key = get_place_key(pl.dcid, place_type.value)
        sv_place_latest_date[sv][pl_key] = exist_checks.get(sv, {}).get(
            pl_key, ftypes.ExistInfo()).latest_valid_date
  return sv_place_latest_date
