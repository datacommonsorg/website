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

import dataclasses
import datetime
import random
import re
import time
from typing import Any, Dict, List, Set

from dateutil.relativedelta import relativedelta

import server.lib.fetch as fetch
import server.lib.nl.common.constants as constants
import server.lib.nl.common.counters as ctr
import server.lib.nl.common.utterance as nl_uttr
import server.lib.nl.detection.date
import server.lib.nl.detection.types as types
from server.lib.nl.fulfillment.types import Sv2Place2Date
import server.lib.nl.fulfillment.utils as futils
import server.services.datacommons as dc
import shared.lib.constants as shared_constants

# TODO: Consider tweaking/reducing this
NUM_CHILD_PLACES_FOR_EXISTENCE = 15
_FACET_OBS_PERIOD_RE = r'P(\d+)(Y|M)'
_YEAR_FORMAT = 'YYYY'
_MAX_DATES_FOR_EXISTENCE = 10
_MONTH_GRANULARITY = 'M'


# Custom dc topics, svgs and svpgs start with "c/".
def is_topic(sv):
  return sv.startswith("dc/topic/") or sv.startswith("c/topic/")


def is_svg(sv):
  return sv.startswith("dc/g/") or sv.startswith("c/g/")


def is_svpg(sv):
  return sv.startswith("dc/svpg/") or sv.startswith("c/svpg/")


def is_sv(sv):
  return not (is_topic(sv) or is_svg(sv))


# Checks if there is an event in the last 3 years.
def event_existence_for_place(place: str, event: types.EventType,
                              counters: ctr.Counters) -> bool:
  for event_type in constants.EVENT_TYPE_TO_DC_TYPES[event]:
    start = time.time()
    date_list = fetch.event_collection_date(event_type,
                                            place).get('eventCollectionDate',
                                                       {}).get('dates', [])
    counters.timeit('event_existence_for_place', start)
    cur_year = datetime.datetime.now().year
    prev_year = str(cur_year - 1)
    two_years = str(cur_year - 2)
    three_years = str(cur_year - 3)
    cur_year = str(cur_year)
    # A crude recency check
    for date in date_list:
      for year in [cur_year, prev_year, two_years, three_years]:
        if date.startswith(year):
          return True
  return False


#
# Returns a list of existing SVs (as a union across places).
# The order of the returned SVs matches the input order.
#
def sv_existence_for_places(places: List[str], svs: List[str],
                            counters: ctr.Counters) -> List[str]:
  if not svs:
    return [], {}

  start = time.time()
  sv_existence = fetch.observation_existence(svs, places)
  counters.timeit('sv_existence_for_places', start)
  if not sv_existence:
    counters.err('sv_existence_for_places_failed', {
        'nplaces': len(places),
        'svs': len(svs)
    })
    return [], {}

  existing_svs = []
  existsv2places = {}
  for sv in svs:
    exists = False
    for pl, exist_bit in sv_existence.get(sv, {}).items():
      if not exist_bit:
        continue
      exists = True
      if sv not in existsv2places:
        existsv2places[sv] = set()
      existsv2places[sv].add(pl)
    if exists:
      existing_svs.append(sv)

  return existing_svs, existsv2places


def facet_contains_date(facet_data, facet_metadata, single_date,
                        date_range) -> bool:
  start_date, end_date = server.lib.nl.detection.date.get_date_range_strings(
      date_range)
  if single_date:
    date_string = server.lib.nl.detection.date.get_date_string(single_date)
    start_date, end_date = date_string, date_string
  facet_earliest_date = facet_data.get('earliestDate', '')
  facet_latest_date = facet_data.get('latestDate', '')
  date_length = max(len(start_date), len(end_date))
  # Check that start date is earlier than the latest facet date. Trim start date
  # if it is longer than the facet date so that we're only comparing the largest
  # of the two date granularities.
  if (start_date and start_date[0:len(facet_latest_date)] > facet_latest_date):
    return False
  # Check that end date is later than the earliest facet date. Trim facet date
  # if it is longer than the end date so that we're only comparing the largest
  # of the two date granularities.
  if (end_date and end_date < facet_earliest_date[0:len(end_date)]):
    return False
  # If not single date, finish checks here. Otherwise, need to also check
  # granularity and use observation period to predict if the date is contained
  # in the facet.
  if not single_date:
    return True
  # If the facet dates are different granularity, consider facet to not have
  # the date. Assume start_date and end_date will be the same granularity.
  # TODO: allow for different granularity but same year.
  if (date_length != len(facet_earliest_date) or
      date_length != len(facet_latest_date)):
    return False
  # Use observation period of the facet to predict if facet has data for
  # date of interest.
  # TODO: this is not 100% accurate, so frontend needs to fail gracefully
  # when a tile doesn't have data
  obs_period = facet_metadata.get('observationPeriod', '')
  obs_period_match = re.match(_FACET_OBS_PERIOD_RE, obs_period)
  if obs_period_match:
    obs_period_num, _ = obs_period_match.groups()
    obs_period_num = int(obs_period_num)
    # Difference in years between date of interest and earliest date
    # of the facet
    year_diff = single_date.year - int(facet_earliest_date[:4])
    if single_date.month:
      # Difference in number of months between the date of interest
      # and the earliest date of the facet.
      # Dates are in the format YYYY-MM, so 5 is the index in the string where
      # the month part begins.
      month_diff = year_diff * 12 + single_date.month - int(
          facet_earliest_date[5:])
      # Check that the difference in months is divisble by the obs period
      if month_diff % obs_period_num != 0:
        return False
    # If the date to check is only a year, check that the difference in
    # years is divisible by the obs period
    elif year_diff % obs_period_num != 0:
      return False
  elif len(start_date) != len(_YEAR_FORMAT):
    # Some yearly datasets do not set obsPeriod, so we should only allow empty
    # obsPeriod for a date that is in the year format.
    return False
  return True


# Returns:
# 1. a map of existing SVs (keyed by SV DCID) to map of existing places
# (keyed by place dcid) to facet metadata for a facet that has data for this
# SV and place
# 2. a map of existing SVs to a map of places to whether or not that SV, place
# combo has any single data point series
def sv_existence_for_places_check_single_point(
    places: List[str], svs: List[str], single_date: types.Date,
    date_range: types.Date, counters: ctr.Counters
) -> tuple[Dict[str, Dict[str, Dict[str, str]]], Dict[str, Dict[str, bool]]]:
  if not svs:
    return {}, {}

  check_date = bool(single_date) | bool(date_range)
  start = time.time()
  series_facet = fetch.series_facet(entities=places,
                                    variables=svs,
                                    all_facets=check_date)
  counters.timeit('sv_existence_for_places_check_single_point', start)

  existing_svs = {}
  existsv2places = {}
  facet_info = series_facet.get('facets', {})
  for sv, sv_data in series_facet.get('data', {}).items():
    for pl, place_data in sv_data.items():
      for facet_data in place_data:
        facet_id = facet_data.get('facet', '')
        facet_metadata = facet_info.get(facet_id, {})
        # Check that this facet has data for specified date
        if check_date and not facet_contains_date(facet_data, facet_metadata,
                                                  single_date, date_range):
          continue
        num_obs = facet_data.get('obsCount', 0)
        if sv not in existing_svs:
          existing_svs[sv] = {}
        facet_metadata['facetId'] = facet_id
        facet_metadata['earliestDate'] = facet_data.get('earliestDate', '')
        facet_metadata['latestDate'] = facet_data.get('latestDate', '')
        existing_svs[sv][pl] = facet_metadata
        if sv not in existsv2places:
          existsv2places[sv] = {}
        existsv2places[sv][pl] = (num_obs == 1)
        # There only needs to exist at least one facet that works for a place,
        # so can move on to next place once a facet is found
        break
  return existing_svs, existsv2places


# From a list of obs dates (which are objects with a date field and additional
# info about that date), get the index of the latest date that is less than or
# equal to the end_date and greater than or equal to the start_date.
# Returns -1 if no valid date found.
def _get_max_valid_date_idx(obs_dates: List[Dict[str, any]], start_date: str,
                            end_date: str) -> int:
  max_valid_idx = -1
  lo = 0
  hi = len(obs_dates) - 1
  while lo <= hi:
    mid = (lo + hi) // 2
    if obs_dates[mid].get('date', '')[0:len(end_date)] <= end_date:
      max_valid_idx = mid
      lo = mid + 1
    else:
      hi = mid - 1
  # If date found is earlier than start date, return -1 because date is not
  # not valid
  if max_valid_idx > -1 and obs_dates[max_valid_idx].get('date',
                                                         '') < start_date:
    max_valid_idx = -1
  return max_valid_idx


# For each place and sv, gets the best available date (most entities with data
# for this date and within _MAX_DATES_FOR_EXISTENCE dates of the date range) to
# use as the latest date for the children of that place.
# Returns a map of sv -> place key (place + child type) -> latest date.
def get_contained_in_latest_date(places: List[str],
                                 child_type: types.ContainedInPlaceType,
                                 svs: List[str],
                                 date_range: types.Date) -> Sv2Place2Date:
  sv_place_latest_date = {}
  # This method only gets the date for children of a place
  if not date_range or not child_type:
    return sv_place_latest_date
  start_date, end_date = server.lib.nl.detection.date.get_date_range_strings(
      date_range)
  for place in places:
    place_key = get_place_key(place, child_type)
    series_dates = dc.get_series_dates(place, child_type, svs)
    for dates_by_variable in series_dates.get('datesByVariable', []):
      sv = dates_by_variable.get('variable', '')
      if sv not in sv_place_latest_date:
        sv_place_latest_date[sv] = {}

      obs_dates = dates_by_variable.get('observationDates', [])
      max_valid_idx = _get_max_valid_date_idx(obs_dates, start_date, end_date)
      # If no valid date found, move on to the next variable
      if max_valid_idx < 0:
        continue

      # Starting at max_valid_idx, check _MAX_DATES_FOR_EXISTENCE number of
      # earlier dates to get the best date to use
      max_entity_count = 0
      for idx in range(max_valid_idx,
                       max(-1, max_valid_idx - _MAX_DATES_FOR_EXISTENCE), -1):
        obs_date = obs_dates[idx]
        date = obs_date.get('date', '')
        # If we've reached a date that's earlier than the start date, can break
        # out of this search
        if date < start_date[0:len(date)]:
          break
        entity_count = max([
            count.get('count', 0) for count in obs_date.get('entityCount', [])
        ])
        if entity_count > max_entity_count:
          max_entity_count = entity_count
          sv_place_latest_date[sv][place_key] = date

  return sv_place_latest_date


# For each sv and place key in sv_place_facet, predict the latest date that is
# within the date range by either:
# a. taking the latest date for the sv and place if it is within the date range
# b. starting at the latest date for the sv and place and using the observation
#    period to find an available date that is within the date range
def get_predicted_latest_date(sv_place_facet, date_range):
  sv_place_latest_date = {}
  start_date, end_date = server.lib.nl.detection.date.get_date_range_strings(
      date_range)
  for sv, place_facet in sv_place_facet.items():
    sv_place_latest_date[sv] = {}
    for plk, facet in place_facet.items():
      latest_date_str = facet.get('latestDate', '')

      # Every facet in sv_place_facet is a valid facet for the date range so
      # as long as the latest date is earlier than the end date, we know it must
      # be a valid date.
      if latest_date_str[0:len(end_date)] <= end_date:
        date = facet.get('latestDate')
        sv_place_latest_date[sv][plk] = date
        continue

      obs_period = facet.get('observationPeriod', '')
      obs_period_match = re.match(_FACET_OBS_PERIOD_RE, obs_period)
      # If there is a valid observation period, use the observation period to
      # predict the latest valid date.
      if obs_period_match:
        obs_period_num, granularity = obs_period_match.groups()
        obs_period_num = int(obs_period_num)

        # Get the latest date as a date object
        latest_date_parts = latest_date_str.split('-')
        latest_date_year = int(latest_date_parts[0])
        latest_date_month = 1 if len(latest_date_parts) < 2 else int(
            latest_date_parts[1])
        latest_date_day = 1 if len(latest_date_parts) < 3 else int(
            latest_date_parts[2])
        latest_date = datetime.date(latest_date_year, latest_date_month,
                                    latest_date_day)

        # Get the date change to use to find the latest valid date
        if granularity == _MONTH_GRANULARITY:
          change_step = relativedelta(months=obs_period_num)
        else:
          change_step = relativedelta(years=obs_period_num)

        # The earliest date that could be used
        date_limit = min(start_date, facet.get('earliestDate', ''))

        # Starting at latest date, go back change_step dates and check if the
        # date is valid for the date range. If valid date, save it as the
        # latest date for the sv + place key combination.
        while True:
          latest_date_iso = latest_date.isoformat()
          if date_limit and latest_date_iso < date_limit:
            break
          if latest_date_iso[0:len(end_date)] <= end_date:
            sv_place_latest_date[sv][plk] = latest_date_iso[
                0:len(latest_date_str)]
            break
          latest_date = latest_date - change_step
      # Some yearly datasets do not set obsPeriod, so assume yearly obsPeriod if
      # the date is in the year format & in this case we can just use the year
      # of the end date as the latest date.
      elif len(latest_date_str) == len(_YEAR_FORMAT):
        sv_place_latest_date[sv][plk] = end_date[0:len(_YEAR_FORMAT)]

  return sv_place_latest_date


#
# Given a place DCID and a child place type, returns a sample list
# of places of that child type.
#
def _get_sample_child_places(main_place_dcid: str,
                             contained_place_type: str) -> List[str]:
  """Find a sampled child place"""
  if not contained_place_type:
    return []
  child_places = fetch.descendent_places([main_place_dcid],
                                         contained_place_type)
  if child_places.get(main_place_dcid):
    return child_places[main_place_dcid][:NUM_CHILD_PLACES_FOR_EXISTENCE]
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
          return child_places[:NUM_CHILD_PLACES_FOR_EXISTENCE]
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
                         counters: ctr.Counters) -> List[types.Place]:
  start = time.time()
  resp = fetch.raw_descendent_places([main_place_dcid], contained_place_type)
  counters.timeit('get_all_child_places', start)

  results = []
  for _, nodes in resp.items():
    for node in nodes:
      if not node.get('dcid') or not node.get('name'):
        continue
      results.append(
          types.Place(dcid=node['dcid'],
                      name=node['name'],
                      place_type=contained_place_type))
  return results


def get_immediate_parent_places(main_place_dcid: str, parent_place_type: str,
                                counters: ctr.Counters) -> List[types.Place]:
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
        types.Place(dcid=node['dcid'],
                    name=node['name'],
                    place_type=parent_place_type))
  # Sort results for determinism.
  results.sort(key=lambda p: p.dcid)
  return results


# Returns a list of parent place names for a dcid.
def parent_place_names(dcid: str) -> List[str]:
  parent_dcids = fetch.property_values(nodes=[dcid],
                                       prop='containedInPlace')[dcid]
  if parent_dcids:
    names = fetch.property_values(nodes=parent_dcids, prop='name')
    ret = [names[p][0] for p in parent_dcids]
    return ret
  return None


# Returns a list of parent place names for a dcid.
def get_un_labels(dcids: List[str]) -> Dict[str, str]:
  resp = fetch.property_values(nodes=dcids, prop='unDataLabel')
  return {p: vals[0] for p, vals in resp.items() if vals}


def trim_classifications(
    classifications: List[types.NLClassifier],
    to_trim: Set[types.ClassificationType]) -> List[types.NLClassifier]:
  ret = []
  for c in classifications:
    if c.type not in to_trim:
      ret.append(c)
  return ret


def get_contained_in_type(
    uttr_or_classifications: Any) -> types.ContainedInPlaceType:
  if isinstance(uttr_or_classifications, nl_uttr.Utterance):
    classification = futils.classifications_of_type_from_utterance(
        uttr_or_classifications, types.ClassificationType.CONTAINED_IN)
  else:
    classification = futils.classifications_of_type(
        uttr_or_classifications, types.ClassificationType.CONTAINED_IN)
  place_type = None
  if (classification and isinstance(classification[0].attributes,
                                    types.ContainedInClassificationAttributes)):
    # Ranking among places.
    place_type = classification[0].attributes.contained_in_place_type
  return place_type


def get_superlatives(uttr: nl_uttr.Utterance) -> List[types.SuperlativeType]:
  classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.SUPERLATIVE)
  superlatives = []
  if (classification and isinstance(classification[0].attributes,
                                    types.SuperlativeClassificationAttributes)):
    # Ranking among places.
    superlatives = classification[0].attributes.superlatives
  return superlatives


def get_ranking_types(uttr: nl_uttr.Utterance) -> List[types.RankingType]:
  classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.RANKING)
  ranking_types = []
  if (classification and isinstance(classification[0].attributes,
                                    types.RankingClassificationAttributes)):
    # Ranking among places.
    ranking_types = classification[0].attributes.ranking_type
  return ranking_types


def get_action_verbs(uttr: nl_uttr.Utterance) -> List[str]:
  classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.DETAILED_ACTION)
  action_verbs = []
  if (classification and
      isinstance(classification[0].attributes,
                 types.DetailedActionClassificationAttributes)):
    action_verbs = classification[0].attributes.actions
  return action_verbs


def get_quantity(
    uttr: nl_uttr.Utterance) -> types.QuantityClassificationAttributes:
  classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.QUANTITY)
  if (classification and isinstance(classification[0].attributes,
                                    types.QuantityClassificationAttributes)):
    return classification[0].attributes
  return None


def get_single_date(uttr: nl_uttr.Utterance) -> types.Date:
  classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.DATE)
  if (classification and isinstance(classification[0].attributes,
                                    types.DateClassificationAttributes)):
    # Return the first date in the classification if it is a single date
    if classification[0].attributes.is_single_date:
      return classification[0].attributes.dates[0]
  return None


def get_date_range(uttr: nl_uttr.Utterance) -> types.Date:
  classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.DATE)
  if (classification and isinstance(classification[0].attributes,
                                    types.DateClassificationAttributes)):
    # Return the first date in the classification if it is not a single date
    if not classification[0].attributes.is_single_date:
      return classification[0].attributes.dates[0]
  return None


def get_time_delta_types(uttr: nl_uttr.Utterance) -> List[types.TimeDeltaType]:
  classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.TIME_DELTA)
  time_delta = []
  # Get time delta type
  if (classification and isinstance(classification[0].attributes,
                                    types.TimeDeltaClassificationAttributes)):
    time_delta = classification[0].attributes.time_delta_types
  return time_delta


def get_event_types(uttr: nl_uttr.Utterance) -> List[types.EventType]:
  classification = futils.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.EVENT)
  event_types = []
  # Get time delta type
  if (classification and isinstance(classification[0].attributes,
                                    types.EventClassificationAttributes) and
      not classification[0].attributes.event_types):
    event_types = classification[0].attributes.event_types
  return event_types


def pluralize_place_type(place_type: str) -> str:
  result = shared_constants.PLACE_TYPE_TO_PLURALS.get(
      place_type.lower(), shared_constants.PLACE_TYPE_TO_PLURALS["place"])
  return result.title()


def has_map(place_type: any, place: types.Place) -> bool:
  if isinstance(place_type, str):
    place_type = types.ContainedInPlaceType(place_type)
  if place_type == types.ContainedInPlaceType.COUNTRY:
    if place.dcid in constants.MAP_ONLY_SUPER_NATIONAL_GEOS:
      return True
    return False

  aatype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place_type, None)
  if aatype and place.country and place.country in constants.ADMIN_AREA_MAP_COUNTRIES:
    return True

  # If the parent place is in USA, check that the child type +
  # parent type combination supports map.
  if (place.country == constants.USA.dcid and
      place.place_type in constants.USA_ONLY_MAP_TYPES.get(place_type, [])):
    return True

  return False


def is_us_place(place: types.Place) -> bool:
  return (place.dcid == constants.USA.dcid or
          place.country == constants.USA.dcid)


def new_session_id(app: str) -> str:
  # Convert seconds to microseconds
  micros = int(datetime.datetime.now().timestamp() * 1000000)
  # Add some randomness to avoid clashes
  rand = random.randrange(10000)
  # Prefix randomness since session_id gets used as BT key
  return str(rand) + '_' + str(micros) + '_' + app


def get_time_delta_title(direction: types.TimeDeltaType,
                         is_absolute: bool) -> str:
  if direction == types.TimeDeltaType.INCREASE:
    prefix = 'Increase'
  elif direction == types.TimeDeltaType.DECREASE:
    prefix = 'Decrease'
  else:
    prefix = 'Change'
  return ' '.join([
      prefix, 'over time',
      '(by absolute change)' if is_absolute else '(by percent change)'
  ])


def get_default_child_place_type(
    place: types.Place,) -> types.ContainedInPlaceType:
  if place.dcid == constants.EARTH_DCID:
    return types.ContainedInPlaceType.COUNTRY
  # Canonicalize the type.
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place.place_type,
                                                   place.place_type)
  ptype = constants.CHILD_PLACE_TYPES.get(ptype, None)
  if ptype:
    ptype = admin_area_equiv_for_place(ptype, place)

  return ptype


def get_parent_place_type(place_type: types.ContainedInPlaceType,
                          place: types.Place) -> types.ContainedInPlaceType:
  # Canonicalize the type.
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place_type, place_type)
  ptype = constants.PARENT_PLACE_TYPES.get(ptype, None)
  if ptype:
    ptype = admin_area_equiv_for_place(ptype, place)
  return ptype


def is_non_geo_place_type(pt: types.ContainedInPlaceType) -> bool:
  return pt.value.lower() in shared_constants.NON_GEO_PLACE_TYPES


#
# Checks whether two types are a direct match or are equivalents purely
# for place type fallback purposes.  If we return false here, then
# we may report falling back from:
#    "pt1 in place" -> "pt2 in place" or "pt1 in place" -> "place"
#
# We account for AA1/AA2 equivalents.
#
# Subtly enough, we also ignore non-geo place-types which can also be
# legitimate SVs.
#
def is_place_type_match_for_fallback(pt1: types.ContainedInPlaceType,
                                     pt2: types.ContainedInPlaceType) -> bool:
  if pt1 == pt2:
    return True

  # SCHOOL, for example, is both a place-type and occurs as a stat-var too.
  # For "school students in CA", if we say we fallback from attempting
  # to fulfill "schools in CA" to showing results about "CA", which
  # contains school-related charts, that's quite confusing.
  if ((pt1 != None and is_non_geo_place_type(pt1)) or
      (pt2 != None and is_non_geo_place_type(pt2))):
    return True

  if pt1 != None and pt2 != None:
    pt1_eq = constants.ADMIN_DIVISION_EQUIVALENTS.get(pt1, pt1)
    pt2_eq = constants.ADMIN_DIVISION_EQUIVALENTS.get(pt2, pt2)
    if pt1_eq == pt2 or pt1 == pt2_eq or pt1_eq == pt2_eq:
      return True

  return False


# Given a place-type and a corresponding (contained-in) place,
# returns the specific AdminArea type (County, EurostatNUTS2, etc)
# corresponding to the country that the place is located in.
def admin_area_equiv_for_place(
    place_type: types.ContainedInPlaceType,
    place: types.Place) -> types.ContainedInPlaceType:
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


# Convert the passed in dict or list or dataclass to dict
# recursively.
def to_dict(data):
  if isinstance(data, dict):
    for key, value in data.items():
      data[key] = to_dict(value)
    return data
  elif dataclasses.is_dataclass(data) and not isinstance(data, type):
    return to_dict(dataclasses.asdict(data))
  elif isinstance(data, list):
    for i, item in enumerate(data):
      data[i] = to_dict(item)
    return data
  else:
    return data


# Gets the place key for a place and place type
def get_place_key(place: str, place_type: str):
  if place_type:
    return place + place_type
  else:
    return place
