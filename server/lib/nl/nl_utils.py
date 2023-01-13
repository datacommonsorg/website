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
from typing import Dict, List, Union, Set

import lib.nl.nl_constants as nl_constants


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


def remove_stop_words(input: str, stop_words: Set[str]) -> str:
  """Remove stop words from a string and return the remaining in lower case."""
  res = input.lower().split()
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
  stop_words = copy.deepcopy(nl_constants.STOP_WORDS)

  # Now add the words in the classification heuristics.
  _add_to_set_from_nested_dict(stop_words,
                               nl_constants.QUERY_CLASSIFICATION_HEURISTICS)

  # Also add the plurals.
  add_to_set_from_list(stop_words,
                       list(nl_constants.PLACE_TYPE_TO_PLURALS.keys()))
  add_to_set_from_list(stop_words,
                       list(nl_constants.PLACE_TYPE_TO_PLURALS.values()))

  return stop_words
