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
import random
import re
from typing import Dict, List, NamedTuple, Set, Tuple, Union

import server.lib.nl.constants as constants
import server.lib.nl.detection as detection
import server.lib.nl.fulfillment.context as ctx
import server.lib.nl.utterance as nl_uttr
import server.lib.util as util
import server.services.datacommons as dc

# TODO: This is reading the file on every call.  Improve it!
_CHART_TITLE_CONFIG_RELATIVE_PATH = "../../config/nl_page/chart_titles_by_sv.json"

# TODO: Consider tweaking/reducing this
_NUM_CHILD_PLACES_FOR_EXISTENCE = 20

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


def add_to_set_from_list(set_strings: Set[str], list_string: List[str]) -> None:
  """Adds (in place) every string (in lower case) to a Set of strings."""
  for v_str in list_string:
    if type(v_str) != str:
      continue
    # Only add sentences/words which are strings.
    set_strings.add(v_str.lower())


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

  # Note: we are removing the full sequence of words in every entry in `stop_words`.
  # For example, if a stop_words entry is "these words remove" then the entire
  # sequence "these words remove" will potentially be removed and not individual
  # occurences of "these", "words" and "remove".

  # Using \b<word>\b to match the word and not the string within another word.
  # Example: if looking for "cat" in sentence "cat is a catty animal. i love a cat  but not cats"
  # the words "citty" and "cats" will not be matched.
  input_str = input_str.lower()
  for words in stop_words:
    # Using regex based replacements.
    input_str = re.sub(rf"\b{words}\b", "", input_str)
    # Also replace multiple spaces with a single space.
    input_str = re.sub(r" +", " ", input_str)

  # Return after removing the beginning and trailing white spaces.
  return input_str.strip()


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

  # Sort stop_words by the length (longer strings should come first) so that the
  # longer sentences can be removed first.
  stop_words = sorted(stop_words, key=len, reverse=True)
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


# Checks if there is an event in the last 1 year.
def event_existence_for_place(place: str, event: detection.EventType) -> bool:
  for event_type in constants.EVENT_TYPE_TO_DC_TYPES[event]:
    date_list = dc.get_event_collection_date(event_type,
                                             place).get('eventCollectionDate',
                                                        {}).get('dates', [])
    cur_year = datetime.datetime.now().year
    logging.info(cur_year)
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
# TODO: The per-capita for this should be computed here.
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
def rank_places_by_series_growth(
    places: List[str], sv: str, growth_direction: detection.TimeDeltaType,
    rank_order: detection.RankingType) -> GrowthRankedLists:
  series_data = util.series_core(entities=places,
                                 variables=[sv],
                                 all_facets=False)
  place2denom = _compute_place_to_denom(sv, places)

  if 'data' not in series_data or sv not in series_data['data']:
    return []

  places_with_vals = []
  for place, place_data in series_data['data'][sv].items():
    series = place_data['series']
    if len(series) < 2:
      continue

    try:
      net_growth = compute_series_growth(series, place2denom.get(place, 0))
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
def rank_svs_by_series_growth(
    place: str, svs: List[str], growth_direction: detection.TimeDeltaType,
    rank_order: detection.RankingType) -> GrowthRankedLists:
  series_data = util.series_core(entities=[place],
                                 variables=svs,
                                 all_facets=False)
  place2denom = _compute_place_to_denom(svs[0], [place])

  svs_with_vals = []
  for sv, place_data in series_data['data'].items():
    if place not in place_data:
      continue
    series = place_data[place]['series']
    if len(series) < 2:
      continue

    try:
      net_growth = compute_series_growth(series, place2denom.get(place, 0))
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
def compute_series_growth(series: List[Dict], denom_val: float) -> GrowthRanks:
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
    denom_data = util.point_core(entities=places,
                                 variables=[constants.DEFAULT_DENOMINATOR],
                                 date='',
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
                         key=lambda pair: pair[1].abs,
                         reverse=_TIME_DELTA_SORT_MAP[(growth_direction,
                                                       rank_order)])

  # Rank by pct
  things_by_pct = sorted(things_with_vals,
                         key=lambda pair: pair[1].pct,
                         reverse=_TIME_DELTA_SORT_MAP[(growth_direction,
                                                       rank_order)])

  # Filter first, and then rank by pc
  things_by_pc = []
  for place, growth in things_by_abs:
    if growth.pc != None:
      things_by_pc.append((place, growth))
  things_by_pc = sorted(things_by_pc,
                        key=lambda pair: pair[1].pc,
                        reverse=_TIME_DELTA_SORT_MAP[(growth_direction,
                                                      rank_order)])

  return GrowthRankedLists(abs=[sv for sv, _ in things_by_abs],
                           pct=[sv for sv, _ in things_by_pct],
                           pc=[sv for sv, _ in things_by_pc])


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


def get_all_child_places(main_place_dcid: str,
                         contained_place_type: str) -> List[detection.Place]:
  payload = dc.get_places_in_v1([main_place_dcid], contained_place_type)
  results = []
  for entry in payload.get('data', []):
    if 'node' not in entry:
      continue
    for value in entry.get('values', []):
      if 'dcid' not in value or 'name' not in value:
        continue
      results.append(
          detection.Place(dcid=value['dcid'],
                          name=value['name'],
                          place_type=contained_place_type))
  return results


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
  sv2footnote_raw = dc.property_values(all_svs, 'footnote')
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
  parent_dcids = dc.property_values(nodes=[dcid], prop='containedInPlace')[dcid]
  if parent_dcids:
    names = dc.property_values(nodes=parent_dcids, prop='name')
    ret = [names[p][0] for p in parent_dcids]
    return ret
  return None


def place_detection_with_heuristics(query_fn, query: str) -> List[str]:
  """Returns all strings in the `query` detectd as places.
  
  Uses many string transformations of `query`, e.g. Title Case, to produce
  candidate query strings which are all used for place detection. Among the
  detected places, any place string entirely contained inside another place
  string is ignored, i.e. if both "New York" and "New York City" are detected
  then only "New York City" is returned.
  
  `query_fn` is the function used with every query string to detect places.
  This function should only expect one required argument: the a query string
  and returns a list of place strings detected in the provided string.
  """
  # Run through all heuristics (various query string transforms).
  query = remove_punctuations(query)
  query_lower = query.lower()
  query_without_stop_words = remove_stop_words(query, constants.STOP_WORDS)
  query_title_case = query.title()
  query_without_stop_words_title_case = query_without_stop_words.title()

  # TODO: work on finding a better fix for important places which are
  # not getting detected.
  # First check in special places. If they are found, add those first.
  places_found = []
  for special_place in constants.OVERRIDE_FOR_NER:
    # Matching <special_place> as a word because otherwise "asia" could
    # also match "asian" which is undesirable.
    if re.search(rf"\b{special_place}\b", query_lower):
      logging.info(f"Found one of the Special Places: {special_place}")
      places_found.append(special_place)

  # Now try all versions of the query.
  for q in [
      query, query_lower, query_without_stop_words, query_title_case,
      query_without_stop_words_title_case
  ]:
    logging.info(f"Trying place detection with: {q}")
    try:
      for p in query_fn(q):
        # remove "the" from the place. This helps where place detection can associate
        # "the" with some places, e.g. "The United States"
        # or "the SF Bay Area". Since we are sometimes doing special casing, e.g. for
        # SF Bay Area, it is desirable to not have place names with these stop words.
        # It also helps de-dupe where "the US" and "US" could both be detected by the
        # heuristics above, for example.
        if "the " in p:
          p = p.replace("the ", "")

        # If the detected place string needs to be replaced with shorter text,
        # then do that here.
        if p.lower() in constants.SHORTEN_PLACE_DETECTION_STRING:
          p = constants.SHORTEN_PLACE_DETECTION_STRING[p.lower()]

        # Also remove place text detected which is exactly equal to some place types
        # e.g. "states" etc. This is a shortcoming of place entity recognitiion libraries.
        # As a specific example, some entity annotation libraries classify "states" as a
        # place. This is incorrect behavior because "states" on its own is not a place.
        if (p.lower() in constants.PLACE_TYPE_TO_PLURALS.keys() or
            p.lower() in constants.PLACE_TYPE_TO_PLURALS.values()):
          continue

        # Add if not already done. Also check for the special places which get
        # added with a ", usa" appended.
        if (p.lower() not in places_found):
          places_found.append(p.lower())
    except Exception as e:
      logging.info(
          f"query_fn {query_fn} raised an exception for query: '{q}'. Exception: {e}"
      )

  places_to_return = []
  # Check if any of the detected place strings are entirely contained inside
  # another detected string. If so, give the longer place string preference.
  # Example: in the query "how about new york state", if both "new york" and
  # "new york state" are detected, then prefer "new york state". Similary for
  # "new york city", "san mateo county", "santa clara county" etc.
  for i in range(0, len(places_found)):
    ignore = False
    for j in range(0, len(places_found)):
      # Checking if the place at index i is contained entirely inside
      # another place at index j != i. If so, it can be ignored.
      if i != j and places_found[i] in places_found[j]:
        ignore = True
        break
    # Insert places_found[i] in the candidates if it is not to be ignored
    # and if it is also found in the original query without punctuations.
    # The extra check to find places_found[i] in `query_lower` is to avoid
    # situations where the removal of some stop words etc makes the remaining
    # query have some valid place name words next to each other. For example,
    # in the query "... united in the states ...", the removal of stop words
    # results in the remaining query being ".... united states ..." which can
    # now find "united states" as a place. Therefore, to avoid such situations
    # we should try to find the place string found in the original (lower case)
    # query string.
    # If places_found[i] was a special place (constants.OVERRIDE_FOR_NER),
    # keep it always.
    if (places_found[i]
        in constants.OVERRIDE_FOR_NER) or (not ignore and
                                           places_found[i] in query_lower):
      places_to_return.append(places_found[i])

  # For all the places detected, re-sort based on the string which occurs first.
  def fn(p):
    res = re.search(rf"\b{p}\b", query_lower)
    if res is None:
      return +1000000
    else:
      return res.start()

  places_to_return.sort(key=fn)
  return places_to_return


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
  result = constants.PLACE_TYPE_TO_PLURALS.get(
      place_type.lower(), constants.PLACE_TYPE_TO_PLURALS["place"])
  return result.title()


def has_map(place_type: any) -> bool:
  if isinstance(place_type, str):
    place_type = detection.ContainedInPlaceType(place_type)
  return place_type in constants.MAP_PLACE_TYPES


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


def get_default_child_place_type(place: detection.Place) -> str:
  if place.dcid == constants.EARTH_DCID:
    return 'Country'
  return constants.CHILD_PLACES_TYPES.get(place.place_type, 'County')
