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
import logging

import copy
import os
import re
from typing import Dict, List, Set
from google.api_core.exceptions import NotFound
from google.cloud import secretmanager

from markupsafe import escape

import shared.lib.constants as constants

_PLACEHOLDER_MAP = {
    f"__PLACEHOLDER_{i}__": exclusion
    for i, exclusion in enumerate(constants.STOP_WORDS_EXCLUSIONS)
}


def _add_to_set_from_list(set_strings: Set[str],
                          list_string: List[str]) -> None:
  """Adds (in place) every string (in lower case) to a Set of strings."""
  for v_str in list_string:
    if type(v_str) != str:
      continue
    # Only add sentences/words which are strings.
    set_strings.add(v_str.lower())


def _add_classification_heuristics(
    set_strings: Set[str], heuristics_to_skip: Dict[str, List[str]]) -> None:
  """Adds (in place) relevant stop words in QUERY_CLASSIFICATION_HEURISTICS.

    Args:
        set_strings: the set of Strings to add to.
    """
  for (ctype, v) in constants.QUERY_CLASSIFICATION_HEURISTICS.items():
    words_to_exclude = []
    if ctype in heuristics_to_skip:
      words_to_exclude = heuristics_to_skip[ctype]
      if not words_to_exclude:
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
    for word in words_to_exclude:
      if word in set_strings:
        set_strings.remove(word)


# Function to replace exclusions with placeholders
def replace_exclusions_with_placeholders(text, placeholder_map):
  for placeholder, exclusion in placeholder_map.items():
    text = re.sub(re.escape(exclusion), placeholder, text)
  return text


# Function to remove words in remove_list but not protected exclusions
def remove_words(text, remove_list):
  for words in remove_list:
    # Using regex based replacements.
    text = re.sub(rf"\b{words}\b", "", text)
    # Also replace multiple spaces with a single space.
    text = re.sub(r" +", " ", text)
  return text


# Function to restore placeholders back to exclusions
def restore_exclusions_with_placeholders(text, placeholder_map):
  for placeholder, exclusion in placeholder_map.items():
    text = re.sub(re.escape(placeholder), exclusion, text)
  return text


def remove_stop_words(input_str: str,
                      stop_words: Set[str],
                      placeholder_map=_PLACEHOLDER_MAP) -> str:
  """Remove stop words from a string and return the remaining in lower case."""

  # Note: we are removing the full sequence of words in every entry in `stop_words`.
  # For example, if a stop_words entry is "these words remove" then the entire
  # sequence "these words remove" will potentially be removed and not individual
  # occurences of "these", "words" and "remove".

  # Using \b<word>\b to match the word and not the string within another word.
  # Example: if looking for "cat" in sentence "cat is a catty animal. i love a cat  but not cats"
  # the words "citty" and "cats" will not be matched.
  input_str = input_str.lower()

  # Protect exclusions
  input_str = replace_exclusions_with_placeholders(input_str, placeholder_map)

  # Remove words in remove_list
  input_str = remove_words(input_str, stop_words)

  # Restore exclusions
  input_str = restore_exclusions_with_placeholders(input_str, placeholder_map)

  # Clean up extra spaces
  input_str = re.sub(r'\s+', ' ', input_str).strip()
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


# TODO: decouple words removal from detected attributes. Today, the removal
# blanket removes anything that matches, including the various attribute/
# classification triggers and contained_in place types (and their plurals).
# This may not always be the best thing to do.
def combine_stop_words(
    heuristics_to_skip: Dict[str,
                             List[str]] = constants.HEURISTIC_TYPES_IN_VARIABLES
) -> List[str]:
  """Returns all the combined stop words from the various constants."""
  # Make a copy.
  stop_words = copy.deepcopy(constants.STOP_WORDS)

  # Now add the words in the classification heuristics.
  _add_classification_heuristics(stop_words, heuristics_to_skip)

  _add_to_set_from_list(stop_words, list_place_type_stopwords())

  # Sort stop_words by the length (longer strings should come first) so that the
  # longer sentences can be removed first.
  stop_words = sorted(stop_words, key=len, reverse=True)
  return stop_words


def remove_punctuations(s, include_comma=False):
  s = s.replace('\'s', '')

  # First replace all periods (.) which cannot be considered decimals or part
  # of an abbreviation in a place name like St. Landry Parish.
  s = re.sub(r'(?<!\d)(?<!St|st)\.(?!\d)', ' ', s)

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


def get_gcp_secret(gcp_project, gcp_path, version='latest'):
  """Fetches a secret from GCP.
  
  Args:
      gcp_project: The GCP project to use to get the secret.
      gcp_path: The path to getting the secret from GCP.

  Returns:
      The requested secret if it exists, otherwise an empty string.
    """
  # Try to get the key from secrets
  try:
    secret_client = secretmanager.SecretManagerServiceClient()
    secret_name = secret_client.secret_version_path(gcp_project, gcp_path,
                                                    version)
    secret_response = secret_client.access_secret_version(name=secret_name)
    return secret_response.payload.data.decode('UTF-8').replace('\n', '')
  except NotFound:
    logging.warning(
        f'No secret found at {gcp_path} of the requested GCP project.')
    return ''


def get_api_key(env_keys=[], gcp_project='', gcp_path=''):
  """Gets an api key first from the environment, then from GCP secrets.
  
  Args:
      env_keys: A list of keys in the environment to try getting the api key with
      gcp_project: The GCP project to use to get the api key from GCP secrets
      gcp_path: The path to getting the api key from GCP secrets

  Returns:
      API key if it exists, otherwise an empty string.
    """
  # Try to get the key from the environment
  for k in env_keys:
    if os.environ.get(k):
      return os.environ.get(k)

  # Try to get the key from secrets
  if gcp_project and gcp_path:
    return get_gcp_secret(gcp_project, gcp_path)

  # If key is not found, return an empty string
  logging.warning(
      f'No key found in the [{",".join(env_keys)}] environment variable(s), nor at "{gcp_path}" of the configured GCP project.'
  )
  return ''


def is_test_env() -> bool:
  env = os.environ.get('FLASK_ENV', '')
  return env in ['integration_test', 'test', 'webdriver']
