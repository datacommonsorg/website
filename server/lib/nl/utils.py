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

import copy
import datetime
import json
import logging
import os
import re
from typing import Dict, List, Set, Union

import lib.nl.constants as constants
import lib.nl.detection as detection
import lib.nl.fulfillment.context as ctx
import lib.nl.utterance as nl_uttr
import lib.util as util
import services.datacommons as dc

_CHART_TITLE_CONFIG_RELATIVE_PATH = "../../config/nl_page/chart_titles_by_sv.json"

_NUM_CHILD_PLACES_FOR_EXISTENCE = 20


def add_to_set_from_list(set_strings: Set[str], list_string: List[str]) -> None:
  """Adds (in place) every string (in lower case) to a Set of strings."""
  for v_str in list_string:
    if type(v_str) != str:
      continue

    for word in v_str.split():
      # Only add words which are strings.
      set_strings.add(word.lower())


def _add_to_set_from_nested_dict(
    set_strings: Set[str],
    nested_dict: Dict[str, Union[List[str], Dict[str, List[str]]]]) -> None:
  """Adds (in place) every word/string (in lower case) to a Set of strings.

    Args:
        set_strings: the set of Strings to add to.
        nested_dict: the dictionary from which to get the words. The keys are expected to be
            strings but the values can either be a List of strings OR another dictionary with
            string keys and values to be a List of strings. For ane example, see the constant
            QUERY_CLASSIFICATION_HEURISTICS in lib/nl/nl_utils.py
    """
  for (_, v) in nested_dict.items():
    if isinstance(v, list):
      # If 'v' is a list, add all the words.
      add_to_set_from_list(set_strings, v)
    elif isinstance(v, dict):
      # If 'v' is a dict, get the values from the dict and add those.
      [
          add_to_set_from_list(set_strings, val_list)
          for (_, val_list) in v.items()
      ]


def remove_stop_words(input_str: str, stop_words: Set[str]) -> str:
  """Remove stop words from a string and return the remaining in lower case."""
  res = input_str.lower().split()
  output = ''
  for w in res:
    if (w not in stop_words):
      output += w + " "
  if not output:
    return ''
  else:
    return output[:-1]


def combine_stop_words() -> Set[str]:
  """Returns all the combined stop words from the various constants."""
  # Make a copy.
  stop_words = copy.deepcopy(constants.STOP_WORDS)

  # Now add the words in the classification heuristics.
  _add_to_set_from_nested_dict(stop_words,
                               constants.QUERY_CLASSIFICATION_HEURISTICS)

  # Also add the plurals.
  add_to_set_from_list(stop_words, list(constants.PLACE_TYPE_TO_PLURALS.keys()))
  add_to_set_from_list(stop_words,
                       list(constants.PLACE_TYPE_TO_PLURALS.values()))

  return stop_words


def remove_punctuations(s):
  s = s.replace('\'s', '')
  s = re.sub(r'[^\w\s]', ' ', s)
  return " ".join(s.split())


def is_topic(sv):
  return sv.startswith("dc/topic/")


def is_svg(sv):
  return sv.startswith("dc/g/")


def is_svpg(sv):
  return sv.startswith("dc/svpg/")


def is_sv(sv):
  return not (is_topic(sv) or is_svg(sv))


#
# Returns a list of existing SVs (as a union across places).
# The order of the returned SVs matches the input order.
#
def sv_existence_for_places(places: List[str], svs: List[str]) -> List[str]:
  if not svs:
    return []

  sv_existence = dc.observation_existence(svs, places)
  if not sv_existence:
    logging.error("Existence checks for SVs failed.")
    return []

  existing_svs = []
  for sv in svs:
    exists = False
    for _, exist_bit in sv_existence['variable'][sv]['entity'].items():
      if not exist_bit:
        continue
      exists = True
      break
    if exists:
      existing_svs.append(sv)

  return existing_svs


# Given a place and a list of existing SVs, this API ranks the SVs
# per the ranking order.
def rank_svs_by_latest_value(place: str, svs: List[str],
                             order: detection.RankingType) -> List[str]:
  points_data = util.point_core(entities=[place],
                                variables=svs,
                                date='',
                                all_facets=False)

  svs_with_vals = []
  for sv, place_data in points_data['data'].items():
    if place not in place_data:
      continue
    point = place_data[place]
    svs_with_vals.append((sv, point['value']))

  reverse = False if order == detection.RankingType.LOW else True
  svs_with_vals = sorted(svs_with_vals,
                         key=lambda pair: pair[1],
                         reverse=reverse)
  return [sv for sv, _ in svs_with_vals]


def has_series_with_single_datapoint(place: str, svs: List[str]):
  series_data = util.series_core(entities=[place],
                                 variables=svs,
                                 all_facets=False)
  for _, place_data in series_data['data'].items():
    if place not in place_data:
      continue
    series = place_data[place]['series']
    if len(series) < 2:
      logging.info('Found single data point series in %s - %s', place,
                   ', '.join(svs))
      return True
  return False


# Given a place and a list of existing SVs, this API ranks the SVs
# per the growth rate of the time-series.
def rank_svs_by_growth_rate(place: str, svs: List[str],
                            growth_direction: detection.TimeDeltaType,
                            rank_order: detection.RankingType) -> List[str]:
  series_data = util.series_core(entities=[place],
                                 variables=svs,
                                 all_facets=False)

  svs_with_vals = []
  for sv, place_data in series_data['data'].items():
    if place not in place_data:
      continue
    series = place_data[place]['series']
    if len(series) < 2:
      continue

    try:
      net_growth_rate = compute_growth_rate(series)
    except Exception as e:
      logging.error('Growth rate computation failed: %s', str(e))
      continue

    if net_growth_rate > 0 and growth_direction != detection.TimeDeltaType.INCREASE:
      continue
    if net_growth_rate < 0 and growth_direction != detection.TimeDeltaType.DECREASE:
      continue

    svs_with_vals.append((sv, net_growth_rate))

  # (growth_direction, rank_order) -> reverse
  sort_map = {
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

  svs_with_vals = sorted(svs_with_vals,
                         key=lambda pair: pair[1],
                         reverse=sort_map[(growth_direction, rank_order)])
  logging.info(svs_with_vals)
  return [sv for sv, _ in svs_with_vals]


# Computes net growth-rate for a time-series including only recent (since 2012) observations.
def compute_growth_rate(series: List[Dict]) -> float:
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

  return _compute_growth(earliest, latest, series)


def _compute_growth(earliest: Dict, latest: Dict,
                    series: List[Dict]) -> datetime.date:
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
  return float(val_delta) / (float(date_delta.days) * start)


def _datestr_to_date(datestr: str) -> datetime.date:
  parts = datestr.split('-')
  if len(parts) == 1:
    return datetime.date(int(parts[0]), 1, 1)
  elif len(parts) == 2:
    return datetime.date(int(parts[0]), int(parts[1]), 1)
  elif len(parts) == 3:
    return datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
  raise ValueError(f'Unable to parse date {datestr}')


#
# Given a place DCID and a child place type, returns a sample list
# of places of that child type.
#
# TODO: Maybe dedupe with data_spec.py
#
def _get_sample_child_places(main_place_dcid: str,
                             contained_place_type: str) -> List[str]:
  """Find a sampled child place"""
  logging.info('_sample_child_place: for %s - %s', main_place_dcid,
               contained_place_type)
  if not contained_place_type:
    return []
  if contained_place_type == "City":
    return ["geoId/0667000"]
  child_places = dc.get_places_in([main_place_dcid], contained_place_type)
  if child_places.get(main_place_dcid):
    logging.info(
        '_sample_child_place returning %s', ', '.join(
            child_places[main_place_dcid][:_NUM_CHILD_PLACES_FOR_EXISTENCE]))
    return child_places[main_place_dcid][:_NUM_CHILD_PLACES_FOR_EXISTENCE]
  else:
    triples = dc.triples(main_place_dcid, 'in').get('triples')
    if triples:
      for prop, nodes in triples.items():
        if prop != 'containedInPlace' and prop != 'geoOverlaps':
          continue
        child_places = []
        for node in nodes['nodes']:
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
                            counters: Dict) -> List[str]:
  result = _get_sample_child_places(main_place_dcid, contained_place_type)
  update_counter(counters, 'child_places_result', {
      'place': main_place_dcid,
      'type': contained_place_type,
      'result': result
  })
  return result


def get_sv_name(all_svs: List[str]) -> Dict:
  sv2name_raw = dc.property_values(all_svs, 'name')
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
    if sv in title_by_sv_dcid:
      sv_name_map[sv] = clean_sv_name(title_by_sv_dcid[sv])
    else:
      sv_name_map[sv] = clean_sv_name(uncurated_names[sv])

  return sv_name_map


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
    name = name.removeprefix(p)
  for s in _SUFFIXES:
    name = name.removesuffix(s)
  return name


def get_only_svs(svs: List[str]) -> List[str]:
  ret = []
  for sv in svs:
    if is_sv(sv):
      ret.append(sv)
  return ret


# Returns a list of parent place names for a dcid.
def parent_place_names(dcid: str) -> List[str]:
  parent_dcids = dc.property_values(nodes=[dcid], prop='containedInPlace')[dcid]
  if parent_dcids:
    names = dc.property_values(nodes=parent_dcids, prop='name')
    ret = [names[p][0] for p in parent_dcids]
    return ret
  return None


# Convenience function to help update counters.
#
# For a given counter, caller should always pass the same type
# for value.  If value is numeric, then its a single added
# counter, otherwise, counter is a list of values.
def update_counter(dbg_counters: Dict, counter: str, value: any):
  should_add = counter not in dbg_counters
  if isinstance(value, int) or isinstance(value, float):
    if should_add:
      dbg_counters[counter] = 0
    dbg_counters[counter] += value
  else:
    if should_add:
      dbg_counters[counter] = []
    dbg_counters[counter].append(value)


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


def get_ranking_types(uttr: nl_uttr.Utterance) -> List[detection.RankingType]:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, detection.ClassificationType.RANKING)
  ranking_types = []
  if (classification and isinstance(classification[0].attributes,
                                    detection.RankingClassificationAttributes)):
    # Ranking among places.
    ranking_types = classification[0].attributes.ranking_type
  return ranking_types


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
