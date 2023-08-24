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
"""Utility functions for use by the NL modules."""

import datetime
import logging
import sys
import time
from typing import Dict, List, NamedTuple, Set, Tuple

import server.lib.fetch as fetch
from server.lib.nl.common import variable
import server.lib.nl.common.constants as constants
import server.lib.nl.common.counters as ctr
import server.lib.nl.detection.types as types

# (growth_direction, rank_order) -> reverse
_TIME_DELTA_SORT_MAP = {
    # Jobs that grew
    (types.TimeDeltaType.INCREASE, None):
        True,
    # Jobs that shrunk
    (types.TimeDeltaType.DECREASE, None):
        False,
    # Highest growing jobs
    (types.TimeDeltaType.INCREASE, types.RankingType.HIGH):
        True,
    # Lowest growing jobs
    (types.TimeDeltaType.INCREASE, types.RankingType.LOW):
        False,
    # Highest shrinking jobs
    (types.TimeDeltaType.DECREASE, types.RankingType.HIGH):
        False,
    # Lowest shrinking jobs
    (types.TimeDeltaType.DECREASE, types.RankingType.LOW):
        True,
    (types.TimeDeltaType.CHANGE, None):
        True,
    (types.TimeDeltaType.CHANGE, types.RankingType.HIGH):
        True,
    (types.TimeDeltaType.CHANGE, types.RankingType.LOW):
        False,
}


# List of vars or places ranked by abs and pct growth.
class GrowthRankedLists(NamedTuple):
  abs: List[str]
  pct: List[str]
  pc: List[str]


# Raw abs and pct growth
class GrowthRanks(NamedTuple):
  abs: float
  pct: float
  pc: float


# Given an SV and list of places, this API ranks the places
# per the growth rate of the time-series.
# TODO: Compute per-date Count_Person
def rank_places_by_series_growth(places: List[str], sv: str,
                                 growth_direction: types.TimeDeltaType,
                                 rank_order: types.RankingType,
                                 nopc_vars: Set[str],
                                 counters: ctr.Counters) -> GrowthRankedLists:
  start = time.time()
  series_data = fetch.series_core(entities=places,
                                  variables=[sv],
                                  all_facets=False)
  place2denom = _compute_place_to_denom(sv, places, nopc_vars)
  # Count the RPC section (since we have multiple exit points)
  counters.timeit('rank_places_by_series_growth', start)

  if 'data' not in series_data or sv not in series_data['data']:
    return []

  places_with_vals = []
  for place, place_data in series_data['data'][sv].items():
    series = place_data['series']
    if len(series) < 2:
      continue

    try:
      net_growth = _compute_series_growth(series, place2denom.get(place, 0))
    except Exception as e:
      logging.error('Growth rate computation failed: %s', str(e))
      continue

    if net_growth.abs > 0 and growth_direction == types.TimeDeltaType.DECREASE:
      continue
    if net_growth.abs < 0 and growth_direction == types.TimeDeltaType.INCREASE:
      continue

    places_with_vals.append((place, net_growth))

  return _compute_growth_ranked_lists(places_with_vals, growth_direction,
                                      rank_order)


# Given a place and a list of existing SVs, this API ranks the SVs
# per the growth rate of the time-series.
def rank_svs_by_series_growth(place: str, svs: List[str],
                              growth_direction: types.TimeDeltaType,
                              rank_order: types.RankingType,
                              nopc_vars: Set[str],
                              counters: ctr.Counters) -> GrowthRankedLists:
  start = time.time()
  series_data = fetch.series_core(entities=[place],
                                  variables=svs,
                                  all_facets=False)
  place2denom = _compute_place_to_denom(svs[0], [place], nopc_vars)
  counters.timeit('rank_svs_by_series_growth', start)

  svs_with_vals = []
  for sv, place_data in series_data['data'].items():
    if place not in place_data:
      continue
    series = place_data[place]['series']
    if len(series) < 2:
      continue

    try:
      net_growth = _compute_series_growth(series, place2denom.get(place, 0))
    except Exception as e:
      logging.error('Growth rate computation failed: %s', str(e))
      continue

    if net_growth.abs > 0 and growth_direction == types.TimeDeltaType.DECREASE:
      continue
    if net_growth.abs < 0 and growth_direction == types.TimeDeltaType.INCREASE:
      continue

    svs_with_vals.append((sv, net_growth))

  return _compute_growth_ranked_lists(svs_with_vals, growth_direction,
                                      rank_order)


# Computes net growth-rate for a time-series including only recent (since 2012) observations.
# Returns a pair of
def _compute_series_growth(series: List[Dict], denom_val: float) -> GrowthRanks:
  latest = None
  earliest = None
  # TODO: Apparently series is ordered, so simplify.
  for s in series:
    if not latest or s['date'] > latest['date']:
      latest = s
    if not earliest or s['date'] < earliest['date']:
      earliest = s

  if not latest or not earliest:
    raise ValueError('Could not find valid points')
  if latest == earliest:
    raise ValueError('Dates are the same!')
  if len(latest['date']) != len(earliest['date']):
    raise ValueError('Dates have different granularity')

  return _compute_growth(earliest, latest, series, denom_val)


def _compute_growth(earliest: Dict, latest: Dict, series: List[Dict],
                    denom_val: float) -> GrowthRanks:
  eparts = earliest['date'].split('-')
  lparts = latest['date'].split('-')

  if len(eparts) == 2 and eparts[1] != lparts[1]:
    # Monthly data often has seasonal effects. So try to pick the earliest date
    # in the same month as the latest date.
    new_earliest_date = eparts[0] + '-' + lparts[1]
    new_earliest = None
    for v in series:
      if v['date'] == new_earliest_date:
        new_earliest = v
        break
    if new_earliest and new_earliest_date != latest['date']:
      logging.info('Changing start month from %s to %s to match %s',
                   earliest['date'], new_earliest_date, latest['date'])
      earliest = new_earliest
    else:
      logging.info('First and last months diverge: %s vs. %s', earliest['date'],
                   latest['date'])

  val_delta = latest['value'] - earliest['value']
  date_delta = _datestr_to_date(latest['date']) - _datestr_to_date(
      earliest['date'])
  # Compute % growth per day
  start = 0.000001 if earliest['value'] == 0 else earliest['value']
  pct = float(val_delta) / (float(date_delta.days) * start)
  abs = float(val_delta) / float(date_delta.days)
  pc = None
  if denom_val > 0:
    pc = (float(val_delta) / denom_val) / float(date_delta.days)
  return GrowthRanks(abs=abs, pct=pct, pc=pc)


def _datestr_to_date(datestr: str) -> datetime.date:
  parts = datestr.split('-')
  if len(parts) == 1:
    return datetime.date(int(parts[0]), 1, 1)
  elif len(parts) == 2:
    return datetime.date(int(parts[0]), int(parts[1]), 1)
  elif len(parts) == 3:
    return datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
  raise ValueError(f'Unable to parse date {datestr}')


def _compute_place_to_denom(sv: str, places: List[str], nopc_vars: Set[str]):
  place2denom = {}
  if (sv != constants.DEFAULT_DENOMINATOR and
      variable.is_percapita_relevant(sv, nopc_vars)):
    denom_data = fetch.point_core(entities=places,
                                  variables=[constants.DEFAULT_DENOMINATOR],
                                  date='LATEST',
                                  all_facets=False)
    for _, sv_data in denom_data['data'].items():
      for place, point in sv_data.items():
        if 'value' in point:
          place2denom[place] = point['value']
  return place2denom


def _compute_growth_ranked_lists(
    things_with_vals: List[Tuple], growth_direction: types.TimeDeltaType,
    rank_order: types.RankingType) -> GrowthRankedLists:
  # Rank by abs
  things_by_abs = sorted(things_with_vals,
                         key=lambda pair: (pair[1].abs, pair[0]),
                         reverse=_TIME_DELTA_SORT_MAP[(growth_direction,
                                                       rank_order)])

  # Rank by pct
  things_by_pct = sorted(things_with_vals,
                         key=lambda pair: (pair[1].pct, pair[0]),
                         reverse=_TIME_DELTA_SORT_MAP[(growth_direction,
                                                       rank_order)])

  # Filter first, and then rank by pc
  things_by_pc = []
  for place, growth in things_by_abs:
    if growth.pc != None:
      things_by_pc.append((place, growth))
  things_by_pc = sorted(things_by_pc,
                        key=lambda pair: (pair[1].pc, pair[0]),
                        reverse=_TIME_DELTA_SORT_MAP[(growth_direction,
                                                      rank_order)])

  return GrowthRankedLists(abs=[sv for sv, _ in things_by_abs],
                           pct=[sv for sv, _ in things_by_pct],
                           pc=[sv for sv, _ in things_by_pc])


# Returns true if the value passes the quantity filter.
def _passes_quantity(val: float, filter: types.Quantity) -> bool:
  lhs = val
  rhs = round(filter.val, 2)
  if filter.cmp == types.QCmpType.EQ:
    return lhs == rhs
  elif filter.cmp == types.QCmpType.GE:
    return lhs >= rhs
  elif filter.cmp == types.QCmpType.GT:
    return lhs > rhs
  elif filter.cmp == types.QCmpType.LE:
    return lhs <= rhs
  elif filter.cmp == types.QCmpType.LT:
    return lhs < rhs
  return False


# Returns true if the value passes the given filter.
def passes_filter(val: float,
                  filter: types.QuantityClassificationAttributes) -> bool:
  val = round(val, 2)
  if filter.qval:
    return _passes_quantity(val, filter.qval)
  else:
    return (_passes_quantity(val, filter.qrange.lower) and
            _passes_quantity(val, filter.qrange.upper))


#
# API to apply a filter and rank stat-vars.
#
def filter_and_rank_places(
    parent_place: types.Place,
    child_type: types.ContainedInPlaceType,
    sv: str,
    filter: types.QuantityClassificationAttributes = None) -> List[types.Place]:
  api_resp = fetch.point_within_core(parent_place.dcid, child_type.value, [sv],
                                     'LATEST', False)
  sv_data = api_resp.get('data', {}).get(sv, {})
  child_and_value = []
  for child_place, value_data in sv_data.items():
    if 'value' not in value_data:
      continue
    val = value_data['value']
    if not filter or passes_filter(val, filter):
      child_and_value.append((child_place, val))

  # Sort place_and_value by value
  child_and_value = sorted(child_and_value,
                           key=lambda pair: (pair[1], pair[0]),
                           reverse=True)
  child_ids = [id for id, _ in child_and_value]
  id2names = fetch.property_values(child_ids, 'name')
  result = []
  for id in child_ids:
    names = id2names.get(id, [])
    if not names:
      continue
    result.append(types.Place(id, names[0], child_type))
  return result


#
# API to apply a filter and rank stat-vars.
#
def filter_and_rank_places_per_capita(
    parent_place: types.Place,
    child_type: types.ContainedInPlaceType,
    sv: str,
    filter: types.QuantityClassificationAttributes = None) -> List[types.Place]:
  api_resp = fetch.point_within_core(parent_place.dcid, child_type.value,
                                     [sv, constants.DEFAULT_DENOMINATOR],
                                     'LATEST', False)

  p2denom = {}
  for p, d in api_resp.get('data', {}).get(constants.DEFAULT_DENOMINATOR,
                                           {}).items():
    if 'value' not in d:
      continue
    p2denom[p] = d['value']

  sv_data = api_resp.get('data', {}).get(sv, {})
  child_and_value = []
  for child_place, value_data in sv_data.items():
    if 'value' not in value_data:
      continue
    if not p2denom.get(child_place):
      continue
    val = value_data['value'] * 100.0 / p2denom[child_place]
    if not filter or passes_filter(val, filter):
      child_and_value.append((child_place, val))

  # Sort place_and_value by value
  child_and_value = sorted(child_and_value,
                           key=lambda pair: (pair[1], pair[0]),
                           reverse=True)
  child_ids = [id for id, _ in child_and_value]
  id2names = fetch.property_values(child_ids, 'name')
  result = []
  for id in child_ids:
    names = id2names.get(id, [])
    if not names:
      continue
    result.append(types.Place(id, names[0], child_type))
  return result


# Returns true if the places should be sorted in ascending. Otherwise, descending.
def sort_filtered_results_lowest_first(
    filter: types.QuantityClassificationAttributes) -> bool:
  if filter.qval and filter.qval.cmp in [types.QCmpType.LE, types.QCmpType.LT]:
    # Return the lowest
    return True
  # For range or GE/GT show the highest.
  return False
