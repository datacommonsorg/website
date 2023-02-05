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

import logging
from typing import List

import lib.nl.constants as constants
import lib.nl.utils as utils
from services import datacommons as dc


class NLPlaceDetector:
  """Performs all place detection for the NL modules."""

  def detect_place_ner(self, query: str) -> List[str]:
    # Making an API call to the NL models server.
    return dc.nl_detect_place_ner(query)

  def detect_places_heuristics(self, query: str) -> List[str]:
    """Returns all strings in the `query` detectd as places."""

    # Run through all heuristics (various query string transforms).
    query = utils.remove_punctuations(query)
    query_without_stop_words = utils.remove_stop_words(query,
                                                       constants.STOP_WORDS)
    query_with_period = query + "."
    query_title_case = query.title()

    # TODO: work on finding a better fix for important places which are
    # not getting detected.
    # First check in special places. If they are found, add those first.
    places_found = []
    for special_place in constants.SPECIAL_PLACES:
      if special_place in query_without_stop_words:
        logging.info(f"Found one of the Special Places: {special_place}")
        places_found.append(special_place)

    # Now try all versions of the query.
    for q in [
        query, query_without_stop_words, query_with_period, query_title_case
    ]:
      logging.info(f"Trying place detection with: {q}")
      try:
        for p in self.detect_place_ner(q):
          # Add if not already done. Also check for the special places which get
          # added with a ", usa" appended.
          if (p.lower() not in places_found):
            places_found.append(p.lower())
      except Exception as e:
        logging.info(
            f"NER model raised an exception for query: '{q}'. Exception: {e}")

    places_to_return = []
    # Check if any of the detected place strings are entirely contained inside
    # another detected string. If so, give the longer place string preference.
    # Example: in the query "how about new york state", if both "new york" and
    # "new york state" are detected, then prefer "new york state". Similary for
    # "new york city", "san mateo county", "santa clara county" etc.
    for i in range(0, len(places_found)):
      ignore = False
      for j in range(0, len(places_found)):
        if i == j:
          continue
        # Checking if the place at index i is contained entirely inside
        # another place at index j != 1. If so, it can be ignored.
        if places_found[i] in places_found[j]:
          ignore = True
      if not ignore:
        places_to_return.append(places_found[i])

    return places_to_return
