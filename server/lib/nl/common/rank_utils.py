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
from server.lib.nl.common.utils import facet_contains_date
from server.lib.nl.detection.date import get_date_range_strings
import server.lib.nl.detection.types as types
from server.lib.nl.fulfillment.utils import get_facet_id

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
# Set of stat vars that need to check which facet is being used before doing
# ranking because they have facets that are too fine in granularity.
# This list of svs are svs in the medium embedding index that have a BLS source.
SVS_TO_CHECK_FACET = set([
    "Count_Establishment_NAICSOtherServices",
    "WagesTotal_Worker_NAICSMiningQuarryingOilGasExtraction",
    "dc/v3qgyhwx13m44",
    "dc/ltwqwtxcq9l23",
    "dc/h1jy2glt2m7e6",
    "Count_Establishment_NAICSFinanceInsurance",
    "dc/rlk1yxmkk1qqg",
    "WagesTotal_Worker_NAICSHealthCareSocialAssistance",
    "Count_Person_Unemployed",
    "dc/tqgf8zv96r5t8",
    "dc/51h3g4mcgj3w4",
    "WagesTotal_Worker_NAICSTotalAllIndustries",
    "dc/bceet4dh33ev",
    "dc/bwr1l8y9we9k7",
    "dc/dchdrg93spxkf",
    "dc/ndg1xk1e9frc2",
    "Count_Establishment_LocalGovernmentOwnedEstablishment_NAICSTotalAllIndustries",
    "Count_Worker_NAICSTotalAllIndustries",
    "WagesTotal_Worker_NAICSArtsEntertainmentRecreation",
    "dc/90nswpkp8wlw5",
    "dc/1j7jmy39fwhw5",
    "dc/qnz3rlypmfvw6",
    "dc/1q3ker7zf14hf",
    "dc/jngmh68j9z4q",
    "dc/z27q5dymqyrnf",
    "Count_Person_InLaborForce",
    "WagesTotal_Worker_NAICSOtherServices",
    "WagesTotal_Worker_NAICSServiceProviding",
    "Count_Worker_NAICSWholesaleTrade",
    "WagesTotal_Worker_NAICSAccommodationFoodServices",
    "dc/c0wxmt45gffxc",
    "dc/fcn7wgvcwtsj2",
    "dc/1jqm2g7cm9m75",
    "dc/8pxklrk2q6453",
    "dc/0hq9z5mspf73f",
    "dc/ntpwcslsbjfc8",
    "dc/n0m3e2r3pxb21",
    "dc/yxxs3hh2g2shd",
    "Count_Worker_NAICSInformation",
    "dc/15lrzqkb6n0y7",
    "dc/w8gp902jnk426",
    "dc/tz59wt1hkl4y",
    "WagesTotal_Worker_NAICSPublicAdministration",
    "Count_Worker_NAICSNonclassifiable",
    "dc/wv0mr2t2f5rj9",
    "Count_Worker_NAICSUtilities",
    "dc/ksynl8pj8w5t5",
    "Count_Establishment_FederalGovernmentOwnedEstablishment_NAICSTotalAllIndustries",
    "Count_Establishment_NAICSServiceProviding",
    "Count_Establishment_NAICSNonclassifiable",
    "WagesTotal_Worker_NAICSManagementOfCompaniesEnterprises",
    "Count_Establishment_NAICSTotalAllIndustries",
    "Count_Worker_NAICSHealthCareSocialAssistance",
    "dc/k4grzkjq201xh",
    "dc/84czmnc1b6sp5",
    "WagesTotal_Worker_NAICSGoodsProducing",
    "dc/w1tfjz3h6138",
    "WagesTotal_Worker_NAICSFinanceInsurance",
    "Count_Worker_NAICSAccommodationFoodServices",
    "Count_Establishment_NAICSUtilities",
    "dc/yn0h4nw4k23f1",
    "dc/x52jxxbwspczh",
    "dc/7bck6xpkc205c",
    "Count_Worker_NAICSProfessionalScientificTechnicalServices",
    "Count_Worker_NAICSAgricultureForestryFishingHunting",
    "dc/107jnwnsh17xb",
    "dc/3jr0p7yjw06z9",
    "dc/fetj39pqls2df",
    "dc/3kwcvm428wpq4",
    "dc/5br285q68be6",
    "dc/lygznlxpkj318",
    "dc/ws19bm1hl105b",
    "dc/hlxvn1t8b9bhh",
    "dc/4ky4sj05bw4nd",
    "WagesTotal_Worker_NAICSProfessionalScientificTechnicalServices",
    "Count_Worker_NAICSServiceProviding",
    "Count_Establishment_NAICSRealEstateRentalLeasing",
    "Count_Worker_NAICSArtsEntertainmentRecreation",
    "dc/n87t9dkckzxc8",
    "Count_Worker_NAICSManagementOfCompaniesEnterprises",
    "Count_Worker_NAICSFinanceInsurance",
    "WagesTotal_Worker_NAICSConstruction",
    "Count_Worker_NAICSConstruction",
    "dc/7w0e0p0dzj82g",
    "dc/mlf5e4m68h2k7",
    "dc/8p97n7l96lgg8",
    "WagesTotal_Worker_NAICSEducationalServices",
    "dc/9yj0bdp6s4ml5",
    "dc/eh7s78v8s14l9",
    "Count_Establishment_NAICSGoodsProducing",
    "WagesTotal_Worker_NAICSInformation",
    "WagesTotal_Worker_NAICSRealEstateRentalLeasing",
    "Count_Worker_NAICSOtherServices",
    "dc/8lqwvg8m9x7z8",
    "dc/dxcbt2knrsgg9",
    "Count_Worker_NAICSGoodsProducing",
    "dc/e2zdnwjjhyj36",
    "Count_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices",
    "dc/br6elkd593zs1",
    "dc/kl7t3p3de7tlh",
    "Count_Worker_NAICSEducationalServices",
    "WagesTotal_Worker_NAICSAdministrativeSupportWasteManagementRemediationServices",
    "Count_Establishment_NAICSConstruction",
    "dc/9pz1cse6yndtg",
    "dc/dy2k68mmhenfd",
    "WagesTotal_Worker_NAICSAgricultureForestryFishingHunting",
    "dc/wzz9t818m1gk8",
    "dc/4mm2p1rxr5wz4",
    "dc/rfdrfdc164y3b",
    "dc/k3hehk50ch012",
    "Count_Worker_NAICSRealEstateRentalLeasing",
    "Count_Establishment_NAICSPublicAdministration",
    "Count_Establishment_NAICSAdministrativeSupportWasteManagementRemediationServices",
    "dc/vp4cplffwv86g",
    "dc/2etwgx6vecreh",
    "dc/34t2kjrwbjd31",
    "dc/6n6l2wrzv7473",
    "Count_Person_Employed",
    "WagesTotal_Worker_NAICSWholesaleTrade",
    "dc/8b3gpw1zyr7bf",
    "dc/wfktw3b5c50h1",
    "WagesTotal_Worker_NAICSUtilities",
    "dc/9t5n4mk2fxzdg",
    "Count_Establishment_PrivatelyOwnedEstablishment_NAICSTotalAllIndustries",
    "Count_Worker_NAICSPublicAdministration",
    "dc/kcns4cvt14zx2",
    "dc/8cssekvykhys5",
    "dc/nesnbmrncfjrb",
    "dc/95gev5g99r7nc",
    "Count_Worker_NAICSMiningQuarryingOilGasExtraction",
    "dc/qgpqqfzwz03d",
    "dc/1wf1h5esex2d",
    "dc/p69tpsldf99h7",
    "Count_Establishment_StateGovernmentOwnedEstablishment_NAICSTotalAllIndustries",
    "dc/63gkdt13bmsv8",
    "dc/mbn7jcx896cd8",
    "dc/h77bt8rxcjve3",
    "dc/2c2e9bn8p7xz6",
    "UnemploymentRate_Person",
    "dc/8j8w7pf73ekn",
    "dc/9kk3vkzn5v0fb",
    "Count_Establishment_NAICSInformation",
    "dc/6ets5evke9mw5",
    "dc/bb4peddkgmqe7",
    "dc/evcytmdmc9xgd",
    "WagesTotal_Worker_NAICSNonclassifiable",
])


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
# Returns a tuple of i) ranked lists of the place dcids, and ii) dict of place
# dcid to facet id of the facet to use for the place
# TODO: Compute per-date Count_Person
def rank_places_by_series_growth(
    places: List[str],
    sv: str,
    growth_direction: types.TimeDeltaType,
    rank_order: types.RankingType,
    nopc_vars: Set[str],
    counters: ctr.Counters,
    place_type: str = '',
    min_population: int = 0,
    date_range: types.Date = None) -> (GrowthRankedLists, Dict[str, str]):
  start = time.time()
  facet_to_fetch = None
  if sv in SVS_TO_CHECK_FACET:
    series_facets = fetch.series_facet(entities=places,
                                       variables=[sv],
                                       all_facets=True)
    for facet_id, facet_metadata in series_facets.get('facets', {}).items():
      # Choose any facet that is not P1M
      if facet_metadata and facet_metadata.get('observationPeriod',
                                               '') != 'P1M':
        facet_to_fetch = [facet_id]
        break
  series_data = fetch.series_core(entities=places,
                                  variables=[sv],
                                  all_facets=bool(date_range),
                                  facet_ids=facet_to_fetch)
  place2denom = _compute_place_to_denom(sv, places)
  # Count the RPC section (since we have multiple exit points)
  counters.timeit('rank_places_by_series_growth', start)

  if 'data' not in series_data or sv not in series_data['data']:
    return []

  places_with_vals = []
  place_facet_ids = {}
  series_facets = series_data.get('facets', {})
  for place, place_data in series_data['data'][sv].items():
    if bool(date_range):
      series = []
      for s in place_data:
        facet_id = s.get('facet', '')
        if facet_contains_date(s, series_facets.get(facet_id, ''), None,
                               date_range):
          series = s.get('series', [])
          place_facet_ids[place] = facet_id
          break
    else:
      series = place_data['series']
      place_facet_ids[place] = place_data.get('facet', '')
    if len(series) < 2:
      continue

    denom = place2denom.get(place, 0)
    if place_type == 'Country' and min_population and denom < min_population:
      continue
    if not variable.is_percapita_relevant(sv, nopc_vars):
      denom = 0
    try:
      net_growth = _compute_series_growth(series, denom, date_range)
    except Exception as e:
      logging.error('Growth rate computation failed: %s', str(e))
      continue

    if net_growth.abs > 0 and growth_direction == types.TimeDeltaType.DECREASE:
      continue
    if net_growth.abs < 0 and growth_direction == types.TimeDeltaType.INCREASE:
      continue

    places_with_vals.append((place, net_growth))

  growth_ranked_lists = _compute_growth_ranked_lists(places_with_vals,
                                                     growth_direction,
                                                     rank_order)
  return growth_ranked_lists, place_facet_ids


# Given a place and a list of existing SVs, this API ranks the SVs
# per the growth rate of the time-series.
def rank_svs_by_series_growth(
    place: str,
    svs: List[str],
    growth_direction: types.TimeDeltaType,
    rank_order: types.RankingType,
    nopc_vars: Set[str],
    counters: ctr.Counters,
    date_range: types.Date = None,
    sv_place_facet_ids: Dict[str, Dict[str, str]] = None) -> GrowthRankedLists:
  start = time.time()
  series_data = fetch.series_core(entities=[place],
                                  variables=svs,
                                  all_facets=bool(date_range))
  place2denom = _compute_place_to_denom(svs[0], [place])
  counters.timeit('rank_svs_by_series_growth', start)

  svs_with_vals = []
  for sv, place_data in series_data['data'].items():
    sv_facet_id = get_facet_id(sv, sv_place_facet_ids, [place])
    if place not in place_data:
      continue
    if bool(date_range):
      series = []
      for s in place_data[place]:
        if s.get('facet', '') == sv_facet_id:
          series = s.get('series', [])
          break
    else:
      series = place_data[place]['series']
    if len(series) < 2:
      continue

    if variable.is_percapita_relevant(sv, nopc_vars):
      denom = place2denom.get(place, 0)
    else:
      denom = 0
    try:
      net_growth = _compute_series_growth(series, denom, date_range)
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


# Gets the earliest and latest observations from a series. If a date range is
# specified, get the earliest and latest within that date range.
def _get_earliest_latest_obs(
    series: List[Dict],
    date_range: types.Date = None) -> (Dict[str, str], Dict[str, str]):
  earliest = None
  latest = None
  if date_range:
    # Get the earliest and latest dates in the series that are within the date
    # range
    date_range_start, date_range_end = get_date_range_strings(date_range)
    for s in series:
      date = s['date']
      if date_range_start and date < date_range_start[0:len(date)]:
        continue
      if date_range_end and date[0:len(date_range_end)] > date_range_end:
        break
      if not latest or date > latest['date']:
        latest = s
      if not earliest or date < earliest['date']:
        earliest = s
  else:
    # Series is ordered by earliest to latest date
    earliest = series[0]
    latest = series[-1]
  return earliest, latest


# Computes net growth-rate for a time-series including only recent (since 2012) observations.
# Returns a pair of
def _compute_series_growth(series: List[Dict],
                           denom_val: float,
                           date_range: types.Date = None) -> GrowthRanks:
  earliest, latest = _get_earliest_latest_obs(series, date_range)

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


def _compute_place_to_denom(sv: str, places: List[str]):
  place2denom = {}
  if sv != constants.DEFAULT_DENOMINATOR:
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
