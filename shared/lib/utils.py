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
import logging
import re
from typing import Dict, List, Set, Union

import shared.lib.constants as constants


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
    # Skip events since we want those to match SVs too!
    if ctype == "Event":
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
  _add_classification_heuristics(stop_words)

  # Also add the plurals.
  _add_to_set_from_list(stop_words,
                        list(constants.PLACE_TYPE_TO_PLURALS.keys()))
  _add_to_set_from_list(stop_words,
                        list(constants.PLACE_TYPE_TO_PLURALS.values()))

  # Sort stop_words by the length (longer strings should come first) so that the
  # longer sentences can be removed first.
  stop_words = sorted(stop_words, key=len, reverse=True)
  return stop_words


def remove_punctuations(s):
  s = s.replace('\'s', '')
  s = re.sub(r'[^\w\s]', ' ', s)
  return " ".join(s.split())


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
