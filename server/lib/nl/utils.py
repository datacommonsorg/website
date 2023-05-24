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
import json
import logging
import os
import random
import time
from typing import Dict, List, NamedTuple, Tuple

import server.lib.fetch as fetch
import server.lib.nl.constants as constants
import server.lib.nl.counters as ctr
import server.lib.nl.detection as detection
import server.lib.nl.fulfillment.context as ctx
import server.lib.nl.utterance as nl_uttr
import server.services.datacommons as dc
import shared.lib.constants as shared_constants

# TODO: This is reading the file on every call.  Improve it!
_CHART_TITLE_CONFIG_RELATIVE_PATH = "../../config/nl_page/chart_titles_by_sv.json"

# TODO: Consider tweaking/reducing this
_NUM_CHILD_PLACES_FOR_EXISTENCE = 15

# (growth_direction, rank_order) -> reverse
_TIME_DELTA_SORT_MAP = {
    # Jobs that grew
    (detection.TimeDeltaType.INCREASE, None):
        True,
    # Jobs that shrunk
    (detection.TimeDeltaType.DECREASE, None):
        False,
    # Highest growing jobs
    (detection.TimeDeltaType.INCREASE, detection.RankingType.HIGH):
        True,
    # Lowest growing jobs
    (detection.TimeDeltaType.INCREASE, detection.RankingType.LOW):
        False,
    # Highest shrinking jobs
    (detection.TimeDeltaType.DECREASE, detection.RankingType.HIGH):
        False,
    # Lowest shrinking jobs
    (detection.TimeDeltaType.DECREASE, detection.RankingType.LOW):
        True,
}


def is_topic(sv):
  return sv.startswith("dc/topic/")


def is_svg(sv):
  return sv.startswith("dc/g/")


def is_svpg(sv):
  return sv.startswith("dc/svpg/")


def is_sv(sv):
  return not (is_topic(sv) or is_svg(sv))


# Checks if there is an event in the last 1 year.
def event_existence_for_place(place: str, event: detection.EventType,
                              counters: ctr.Counters) -> bool:
  for event_type in constants.EVENT_TYPE_TO_DC_TYPES[event]:
    start = time.time()
    date_list = dc.get_event_collection_date(event_type,
                                             place).get('eventCollectionDate',
                                                        {}).get('dates', [])
    counters.timeit('event_existence_for_place', start)
    cur_year = datetime.datetime.now().year
    prev_year = str(cur_year - 1)
    cur_year = str(cur_year)
    # A crude recency check
    for date in date_list:
      if date.startswith(cur_year) or date.startswith(prev_year):
        return True
  return False


#
# Returns a list of existing SVs (as a union across places).
# The order of the returned SVs matches the input order.
#
def sv_existence_for_places(places: List[str], svs: List[str],
                            counters: ctr.Counters) -> List[str]:
  if not svs:
    return []

  start = time.time()
  sv_existence = fetch.observation_existence(svs, places)
  counters.timeit('sv_existence_for_places', start)
  if not sv_existence:
    logging.error("Existence checks for SVs failed.")
    return []

  existing_svs = []
  for sv in svs:
    exists = False
    for _, exist_bit in sv_existence.get(sv, {}).items():
      if not exist_bit:
        continue
      exists = True
      break
    if exists:
      existing_svs.append(sv)

  return existing_svs


# Returns a map of existing SVs (as a union across places)
# keyed by SV DCID with value set to True if the SV has any
# single data point series (across all places).
def sv_existence_for_places_check_single_point(
    places: List[str], svs: List[str],
    counters: ctr.Counters) -> Dict[str, bool]:
  if not svs:
    return {}

  start = time.time()
  series_data = fetch.series_core(entities=places,
                                  variables=svs,
                                  all_facets=False)
  counters.timeit('sv_existence_for_places_check_single_point', start)

  existing_svs = {}
  for sv, sv_data in series_data.get('data', {}).items():
    for _, place_data in sv_data.items():
      if not place_data.get('series'):
        continue
      num_series = len(place_data['series'])
      existing_svs[sv] = existing_svs.get(sv, False) | (num_series == 1)
  print(existing_svs)
  return existing_svs


# Given a place and a list of existing SVs, this API ranks the SVs
# per the ranking order.
# TODO: The per-capita for this should be computed here.
def rank_svs_by_latest_value(place: str, svs: List[str],
                             order: detection.RankingType,
                             counters: ctr.Counters) -> List[str]:
  start = time.time()
  points_data = fetch.point_core(entities=[place],
                                 variables=svs,
                                 date='LATEST',
                                 all_facets=False)
  counters.timeit('rank_svs_by_latest_value', start)

  svs_with_vals = []
  for sv, place_data in points_data['data'].items():
    if place not in place_data:
      continue
    point = place_data[place]
    svs_with_vals.append((sv, point['value']))

  reverse = False if order == detection.RankingType.LOW else True
  svs_with_vals = sorted(svs_with_vals,
                         key=lambda pair: (pair[1], pair[0]),
                         reverse=reverse)
  return [sv for sv, _ in svs_with_vals]


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
                                 growth_direction: detection.TimeDeltaType,
                                 rank_order: detection.RankingType,
                                 counters: ctr.Counters) -> GrowthRankedLists:
  start = time.time()
  series_data = fetch.series_core(entities=places,
                                  variables=[sv],
                                  all_facets=False)
  place2denom = _compute_place_to_denom(sv, places)
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

    if net_growth.abs > 0 and growth_direction != detection.TimeDeltaType.INCREASE:
      continue
    if net_growth.abs < 0 and growth_direction != detection.TimeDeltaType.DECREASE:
      continue

    places_with_vals.append((place, net_growth))

  return _compute_growth_ranked_lists(places_with_vals, growth_direction,
                                      rank_order)


# Given a place and a list of existing SVs, this API ranks the SVs
# per the growth rate of the time-series.
def rank_svs_by_series_growth(place: str, svs: List[str],
                              growth_direction: detection.TimeDeltaType,
                              rank_order: detection.RankingType,
                              counters: ctr.Counters) -> GrowthRankedLists:
  start = time.time()
  series_data = fetch.series_core(entities=[place],
                                  variables=svs,
                                  all_facets=False)
  place2denom = _compute_place_to_denom(svs[0], [place])
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

    if net_growth.abs > 0 and growth_direction != detection.TimeDeltaType.INCREASE:
      continue
    if net_growth.abs < 0 and growth_direction != detection.TimeDeltaType.DECREASE:
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


def _compute_place_to_denom(sv: str, places: List[str]):
  place2denom = {}
  if sv != constants.DEFAULT_DENOMINATOR and is_percapita_relevant(sv):
    denom_data = fetch.point_core(entities=places,
                                  variables=[constants.DEFAULT_DENOMINATOR],
                                  date='LATEST',
                                  all_facets=False)
    for _, sv_data in denom_data['data'].items():
      for place, point in sv_data.items():
        if 'value' in point:
          place2denom[place] = point['value']
  logging.info(place2denom)
  return place2denom


def _compute_growth_ranked_lists(
    things_with_vals: List[Tuple], growth_direction: detection.TimeDeltaType,
    rank_order: detection.RankingType) -> GrowthRankedLists:
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
def _passes_quantity(val: float, filter: detection.Quantity) -> bool:
  lhs = val
  rhs = round(filter.val, 2)
  if filter.cmp == detection.QCmpType.EQ:
    return lhs == rhs
  elif filter.cmp == detection.QCmpType.GE:
    return lhs >= rhs
  elif filter.cmp == detection.QCmpType.GT:
    return lhs > rhs
  elif filter.cmp == detection.QCmpType.LE:
    return lhs <= rhs
  elif filter.cmp == detection.QCmpType.LT:
    return lhs < rhs
  return False


# Returns true if the value passes the given filter.
def passes_filter(val: float,
                  filter: detection.QuantityClassificationAttributes) -> bool:
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
    parent_place: detection.Place, child_type: detection.ContainedInPlaceType,
    sv: str, filter: detection.QuantityClassificationAttributes
) -> List[detection.Place]:
  api_resp = fetch.point_within_core(parent_place.dcid, child_type.value, [sv],
                                     'LATEST', False)
  sv_data = api_resp.get('data', {}).get(sv, {})
  child_and_value = []
  for child_place, value_data in sv_data.items():
    if 'value' not in value_data:
      continue
    val = value_data['value']
    if passes_filter(val, filter):
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
    result.append(detection.Place(id, names[0], child_type))
  return result


# Returns true if the places should be sorted in ascending. Otherwise, descending.
def sort_filtered_results_lowest_first(
    filter: detection.QuantityClassificationAttributes) -> bool:
  if filter.qval and filter.qval.cmp in [
      detection.QCmpType.LE, detection.QCmpType.LT
  ]:
    # Return the lowest
    return True
  # For range or GE/GT show the highest.
  return False


#
# Given a place DCID and a child place type, returns a sample list
# of places of that child type.
#
def _get_sample_child_places(main_place_dcid: str,
                             contained_place_type: str) -> List[str]:
  """Find a sampled child place"""
  logging.info('_sample_child_place: for %s - %s', main_place_dcid,
               contained_place_type)
  if not contained_place_type:
    return []
  child_places = fetch.descendent_places([main_place_dcid],
                                         contained_place_type)
  if child_places.get(main_place_dcid):
    logging.info(
        '_sample_child_place returning %s', ', '.join(
            child_places[main_place_dcid][:_NUM_CHILD_PLACES_FOR_EXISTENCE]))
    return child_places[main_place_dcid][:_NUM_CHILD_PLACES_FOR_EXISTENCE]
  else:
    arcs = fetch.triples([main_place_dcid], False).get(main_place_dcid)
    if arcs:
      for prop, nodes in arcs.items():
        if prop != 'containedInPlace' and prop != 'geoOverlaps':
          continue
        child_places = []
        for node in nodes:
          if contained_place_type in node['types']:
            child_places.append(node['dcid'])
        if child_places:
          logging.info(
              '_sample_child_place returning %s',
              ', '.join(child_places[:_NUM_CHILD_PLACES_FOR_EXISTENCE]))
          return child_places[:_NUM_CHILD_PLACES_FOR_EXISTENCE]
  logging.info('_sample_child_place returning empty')
  return []


def get_sample_child_places(main_place_dcid: str, contained_place_type: str,
                            counters: ctr.Counters) -> List[str]:
  start = time.time()
  result = _get_sample_child_places(main_place_dcid, contained_place_type)
  counters.timeit('get_sample_child_places', start)
  counters.info(
      'child_places_result', {
          'place': main_place_dcid,
          'type': contained_place_type,
          'result': result[:constants.DBG_LIST_LIMIT]
      })
  return result


def get_all_child_places(main_place_dcid: str, contained_place_type: str,
                         counters: ctr.Counters) -> List[detection.Place]:
  start = time.time()
  resp = fetch.raw_descendent_places([main_place_dcid], contained_place_type)
  counters.timeit('get_all_child_places', start)

  results = []
  for _, nodes in resp.items():
    for node in nodes:
      if not node.get('dcid') or not node.get('name'):
        continue
      results.append(
          detection.Place(dcid=node['dcid'],
                          name=node['name'],
                          place_type=contained_place_type))
  return results


def get_immediate_parent_places(
    main_place_dcid: str, parent_place_type: str,
    counters: ctr.Counters) -> List[detection.Place]:
  start = time.time()
  resp = fetch.raw_property_values([main_place_dcid], 'containedInPlace')
  counters.timeit('get_immediate_parent_places', start)
  results = []
  nodes = resp.get(main_place_dcid, [])
  for node in nodes:
    if not node.get('dcid') or not node.get('name') or not node.get('types'):
      continue
    if parent_place_type not in node['types']:
      continue
    results.append(
        detection.Place(dcid=node['dcid'],
                        name=node['name'],
                        place_type=parent_place_type))
  # Sort results for determinism.
  results.sort(key=lambda p: p.dcid)
  return results


def get_sv_name(all_svs: List[str]) -> Dict:
  sv2name_raw = fetch.property_values(all_svs, 'name')
  uncurated_names = {
      sv: names[0] if names else sv for sv, names in sv2name_raw.items()
  }
  basepath = os.path.dirname(__file__)
  title_config_path = os.path.abspath(
      os.path.join(basepath, _CHART_TITLE_CONFIG_RELATIVE_PATH))
  title_by_sv_dcid = {}
  with open(title_config_path) as f:
    title_by_sv_dcid = json.load(f)

  sv_name_map = {}
  # If a curated name is found return that,
  # Else return the name property for SV.
  for sv in all_svs:
    if sv in constants.SV_DISPLAY_NAME_OVERRIDE:
      sv_name_map[sv] = constants.SV_DISPLAY_NAME_OVERRIDE[sv]
    elif sv in title_by_sv_dcid:
      sv_name_map[sv] = clean_sv_name(title_by_sv_dcid[sv])
    else:
      sv_name_map[sv] = clean_sv_name(uncurated_names[sv])

  return sv_name_map


def get_sv_unit(all_svs: List[str]) -> Dict:
  sv_unit_map = {}
  for sv in all_svs:
    # If the dcid has "percent", the unit should be "%"
    if "Percent" in sv:
      sv_unit_map[sv] = "%"
    else:
      sv_unit_map[sv] = ""
  return sv_unit_map


def get_sv_description(all_svs: List[str]) -> Dict:
  sv_desc_map = {}
  for sv in all_svs:
    sv_desc_map[sv] = constants.SV_DISPLAY_DESCRIPTION_OVERRIDE.get(sv, '')
  return sv_desc_map


# TODO: Remove this hack by fixing the name in schema and config.
def clean_sv_name(name: str) -> str:
  _PREFIXES = [
      'Population of People Working in the ',
      'Population of People Working in ',
      'Population of People ',
      'Population Working in the ',
      'Population Working in ',
      'Number of the ',
      'Number of ',
  ]
  _SUFFIXES = [
      ' Workers',
  ]
  for p in _PREFIXES:
    if name.startswith(p):
      name = name[len(p):]
  for s in _SUFFIXES:
    if name.endswith(s):
      name = name[:-len(s)]
  return name


def get_sv_footnote(all_svs: List[str]) -> Dict:
  sv2footnote_raw = fetch.property_values(all_svs, 'footnote')
  uncurated_footnotes = {
      sv: footnotes[0] if footnotes else ''
      for sv, footnotes in sv2footnote_raw.items()
  }
  sv_map = {}
  for sv in all_svs:
    if sv in constants.SV_DISPLAY_FOOTNOTE_OVERRIDE:
      sv_map[sv] = constants.SV_DISPLAY_FOOTNOTE_OVERRIDE[sv]
    else:
      sv_map[sv] = uncurated_footnotes[sv]
  return sv_map


def get_only_svs(svs: List[str]) -> List[str]:
  ret = []
  for sv in svs:
    if is_sv(sv):
      ret.append(sv)
  return ret


# Returns a list of parent place names for a dcid.
def parent_place_names(dcid: str) -> List[str]:
  parent_dcids = fetch.property_values(nodes=[dcid],
                                       prop='containedInPlace')[dcid]
  if parent_dcids:
    names = fetch.property_values(nodes=parent_dcids, prop='name')
    ret = [names[p][0] for p in parent_dcids]
    return ret
  return None


def get_contained_in_type(
    uttr: nl_uttr.Utterance) -> detection.ContainedInPlaceType:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, detection.ClassificationType.CONTAINED_IN)
  place_type = None
  if (classification and
      isinstance(classification[0].attributes,
                 detection.ContainedInClassificationAttributes)):
    # Ranking among places.
    place_type = classification[0].attributes.contained_in_place_type
  return place_type


def get_size_types(uttr: nl_uttr.Utterance) -> List[detection.SizeType]:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, detection.ClassificationType.SIZE_TYPE)
  size_types = []
  if (classification and
      isinstance(classification[0].attributes,
                 detection.SizeTypeClassificationAttributes)):
    # Ranking among places.
    size_types = classification[0].attributes.size_types
  return size_types


def get_ranking_types(uttr: nl_uttr.Utterance) -> List[detection.RankingType]:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, detection.ClassificationType.RANKING)
  ranking_types = []
  if (classification and isinstance(classification[0].attributes,
                                    detection.RankingClassificationAttributes)):
    # Ranking among places.
    ranking_types = classification[0].attributes.ranking_type
  return ranking_types


def get_quantity(
    uttr: nl_uttr.Utterance) -> detection.QuantityClassificationAttributes:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, detection.ClassificationType.QUANTITY)
  if (classification and
      isinstance(classification[0].attributes,
                 detection.QuantityClassificationAttributes)):
    return classification[0].attributes
  return None


def get_time_delta_types(
    uttr: nl_uttr.Utterance) -> List[detection.TimeDeltaType]:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, detection.ClassificationType.TIME_DELTA)
  time_delta = []
  # Get time delta type
  if (classification and
      isinstance(classification[0].attributes,
                 detection.TimeDeltaClassificationAttributes)):
    time_delta = classification[0].attributes.time_delta_types
  return time_delta


def pluralize_place_type(place_type: str) -> str:
  result = shared_constants.PLACE_TYPE_TO_PLURALS.get(
      place_type.lower(), shared_constants.PLACE_TYPE_TO_PLURALS["place"])
  return result.title()


def has_map(place_type: any, places: List[detection.Place]) -> bool:
  if isinstance(place_type, str):
    place_type = detection.ContainedInPlaceType(place_type)
  if place_type == detection.ContainedInPlaceType.COUNTRY:
    return True
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place_type, None)
  if not ptype or not places:
    # Either not an equivalent type or places is empty, no map!
    return False
  return places[0].country in constants.ADMIN_AREA_MAP_COUNTRIES


def new_session_id() -> str:
  # Convert seconds to microseconds
  micros = int(datetime.datetime.now().timestamp() * 1000000)
  # Add some randomness to avoid clashes
  rand = random.randrange(1000)
  # Prefix randomness since session_id gets used as BT key
  return str(rand) + '_' + str(micros)


def get_time_delta_title(direction: detection.TimeDeltaType,
                         is_absolute: bool) -> str:
  return ' '.join([
      'Increase' if direction == detection.TimeDeltaType.INCREASE else
      'Decrease', 'over time',
      '(by absolute change)' if is_absolute else '(by percent change)'
  ])


#
# Per-capita handling
#

_SV_PARTIAL_DCID_NO_PC = [
    'Temperature',
    'Precipitation',
    "BarometricPressure",
    "CloudCover",
    "PrecipitableWater",
    "Rainfall",
    "Snowfall",
    "Visibility",
    "WindSpeed",
    "ConsecutiveDryDays",
    "Percent",
    "Area_",
    "Median_",
    "LifeExpectancy_",
    "AsFractionOf",
    "AsAFractionOfCount",
    "UnemploymentRate_",
    "Mean_Income_",
    "GenderIncomeInequality_",
    "FertilityRate_",
    "GrowthRate_",
    "sdg/",
]

_SV_FULL_DCID_NO_PC = ["Count_Person"]


def is_percapita_relevant(sv_dcid: str) -> bool:
  for skip_phrase in _SV_PARTIAL_DCID_NO_PC:
    if skip_phrase in sv_dcid:
      return False
  for skip_sv in _SV_FULL_DCID_NO_PC:
    if skip_sv == sv_dcid:
      return False
  return True


def get_default_child_place_type(
    place: detection.Place) -> detection.ContainedInPlaceType:
  if place.dcid == constants.EARTH_DCID:
    return detection.ContainedInPlaceType.COUNTRY
  # Canonicalize the type.
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place.place_type,
                                                   place.place_type)
  ptype = constants.CHILD_PLACE_TYPES.get(ptype, None)
  if ptype:
    ptype = admin_area_equiv_for_place(ptype, place)
  # TODO: Since most queries/data tends to be US specific and we have
  # maps for it, we pick County as default, but reconsider in future.
  if not ptype:
    ptype = detection.ContainedInPlaceType.COUNTY
  return ptype


def get_parent_place_type(
    place_type: detection.ContainedInPlaceType,
    place: detection.Place) -> detection.ContainedInPlaceType:
  # Canonicalize the type.
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place_type, place_type)
  ptype = constants.PARENT_PLACE_TYPES.get(ptype, None)
  if ptype:
    ptype = admin_area_equiv_for_place(ptype, place)
  return ptype


# Given a place-type and a corresponding (contained-in) place,
# returns the specific AdminArea type (County, EurostatNUTS2, etc)
# corresponding to the country that the place is located in.
def admin_area_equiv_for_place(
    place_type: detection.ContainedInPlaceType,
    place: detection.Place) -> detection.ClassificationAttributes:
  # Convert to AA equivalent
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place_type, None)
  # Not an admin-equivalent type
  if not ptype:
    return place_type

  custom_remap = {}
  if place.country == 'country/USA':
    custom_remap = constants.USA_PLACE_TYPE_REMAP
  elif place.country == 'country/PAK':
    custom_remap = constants.PAK_PLACE_TYPE_REMAP
  elif place.country in constants.EU_COUNTRIES:
    custom_remap = constants.EU_PLACE_TYPE_REMAP

  return custom_remap.get(ptype, ptype)


# Returns true if the score of multi-sv detection exceeds the single
# SV detection.
def is_multi_sv(uttr: nl_uttr.Utterance) -> bool:
  if (not uttr.detection.svs_detected.sv_scores or not uttr.multi_svs or
      not uttr.multi_svs.candidates):
    return False
  # Get the top single-sv and multi-sv scores.
  top_sv_score = uttr.detection.svs_detected.sv_scores[0]
  top_multi_sv_score = uttr.multi_svs.candidates[0].aggregate_score

  # Prefer multi-sv when the scores are higher or up to a score differential.
  if (top_multi_sv_score > top_sv_score or top_sv_score - top_multi_sv_score
      <= shared_constants.MULTI_SV_SCORE_DIFFERENTIAL):
    return True
  return False


def has_dual_sv(uttr: nl_uttr.Utterance) -> bool:
  if not is_multi_sv(uttr):
    return False
  for c in uttr.multi_svs.candidates:
    if len(c.parts) == 2:
      return True
  return False
