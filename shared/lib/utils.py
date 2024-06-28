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
"""Utility functions shared across servers."""

import copy
import os
import re
from typing import List, Set

from markupsafe import escape

import shared.lib.constants as constants
import logging


def _add_to_set_from_list(set_strings: Set[str],
                          list_string: List[str]) -> None:
  """Adds (in place) every string (in lower case) to a Set of strings."""
  for v_str in list_string:
    if type(v_str) != str:
      continue
    # Only add sentences/words which are strings.
    set_strings.add(v_str.lower())


def _add_classification_heuristics(set_strings: Set[str]) -> None:
  """Adds (in place) relevant stop words in QUERY_CLASSIFICATION_HEURISTICS.

    Args:
        set_strings: the set of Strings to add to.
    """
  for (ctype, v) in constants.QUERY_CLASSIFICATION_HEURISTICS.items():
    if ctype in constants.HEURISTIC_TYPES_IN_VARIABLES:
      continue
    if isinstance(v, list):
      # If 'v' is a list, add all the words.
      _add_to_set_from_list(set_strings, v)
    elif isinstance(v, dict):
      # If 'v' is a dict, get the values from the dict and add those.
      [
          _add_to_set_from_list(set_strings, val_list)
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
  for word in stop_words:
    # Using regex based replacements.
    ex = constants.STOP_WORDS_EXCEPTION.get(word, ['', ''])
    reg_str = ''
    if ex[0]:
      reg_str += rf"(?<!\b{ex[0]}\s)"
    reg_str += rf"\b{word}\b"
    if ex[1]:
      reg_str += rf"(?!\s{ex[1]})"
    input_str = re.sub(
        reg_str,
        "",
        input_str,
    )
    # Also replace multiple spaces with a single space.
    input_str = re.sub(r" +", " ", input_str)

  # Return after removing the beginning and trailing white spaces.
  return input_str.strip()


def list_place_type_stopwords() -> List[str]:
  # Get plurals correspnding to stop-word exclusion place-types.
  #
  # This also helps validate that NON_GEO_PLACE_TYPES has the right keys,
  stopword_exclusion_place_type_plurals = set([
      constants.PLACE_TYPE_TO_PLURALS[x] for x in constants.NON_GEO_PLACE_TYPES
  ])
  # Get singular stop-words skipping exclusion.
  place_type_stop_words = [
      it for it in constants.PLACE_TYPE_TO_PLURALS.keys()
      if it not in constants.NON_GEO_PLACE_TYPES
  ]
  # Get plural stop-words skipping exclusion.
  place_type_stop_words.extend([
      it for it in constants.PLACE_TYPE_TO_PLURALS.values()
      if it not in stopword_exclusion_place_type_plurals
  ])
  return place_type_stop_words


def combine_stop_words() -> Set[str]:
  """Returns all the combined stop words from the various constants."""
  # Make a copy.
  stop_words = copy.deepcopy(constants.STOP_WORDS)

  # Now add the words in the classification heuristics.
  _add_classification_heuristics(stop_words)

  _add_to_set_from_list(stop_words, list_place_type_stopwords())

  # Sort stop_words by the length (longer strings should come first) so that the
  # longer sentences can be removed first.
  stop_words = sorted(stop_words, key=len, reverse=True)
  return stop_words


def remove_punctuations(s, include_comma=False):
  s = s.replace('\'s', '')

  # First replace all periods (.) which cannot be considered decimals.
  s = re.sub(r'(?<!\d)\.(?!\d)', ' ', s)

  # Now replace all punctuation which is not a period (.)
  if include_comma:
    s = re.sub(r'[^\w\s,.]', ' ', s)
  else:
    s = re.sub(r'[^\w\s.]', ' ', s)
  return " ".join(s.split())


def is_debug_mode() -> bool:
  return os.environ.get('DEBUG', '').lower() == 'true'


# Converts a passed in object and escapes all the strings in it.
def escape_strings(data):
  if isinstance(data, dict):
    escaped_dict = {}
    for k, v in data.items():
      escaped_dict[str(escape(k))] = escape_strings(v)
    return escaped_dict
  elif isinstance(data, list):
    for i, item in enumerate(data):
      data[i] = escape_strings(item)
    return data
  elif isinstance(data, str):
    return str(escape(data))
  else:
    # Otherwise, assume data is of a type that doesn't need escaping and just
    # return it as is.
    return data


def is_test_env() -> bool:
  env = os.environ.get('FLASK_ENV', '')
  return env in ['integration_test', 'test', 'webdriver']
