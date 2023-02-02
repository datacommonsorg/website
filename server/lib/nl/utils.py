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
import json
import logging
import os
import re
from typing import Dict, List, Set, Union

import lib.nl.constants as constants
import lib.nl.detection as detection
import lib.util as util
from routes.api.series import series_core
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
def ranked_svs_for_place(place: str, svs: List[str],
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
  series_data = series_core(entities=[place], variables=svs, all_facets=False)
  for _, place_data in series_data['data'].items():
    if place not in place_data:
      continue
    series = place_data[place]['series']
    if len(series) < 2:
      logging.info('Found single data point series in %s - %s', place,
                   ', '.join(svs))
      return True
  return False


#
# Given a place DCID and a child place type, returns a sample list
# of places of that child type.
#
# TODO: Maybe dedupe with data_spec.py
#
def get_sample_child_places(main_place_dcid: str,
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
      sv_name_map[sv] = title_by_sv_dcid[sv]
    else:
      sv_name_map[sv] = uncurated_names[sv]

  return sv_name_map


def get_only_svs(svs: List[str]) -> List[str]:
  ret = []
  for sv in svs:
    if is_sv(sv):
      ret.append(sv)
  return ret
