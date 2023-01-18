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

from typing import List
import en_core_web_md
import logging

import lib.nl.nl_constants as nl_constants
import lib.nl.nl_utils as nl_utils


class NLPlaceDetector:
  """Performs all place detection for the NL modules.
    
    Attributes:
        ner_model: the Named Entity Recognition model, e.g. the ones made available
            by the spaCy library: https://github.com/explosion/spacy-models/ 
            By default, it is the `en_core_web_md` model.
    """

  def __init__(self, ner_model=None) -> None:
    self.ner_model = ner_model
    if self.ner_model is None:
      self.ner_model = en_core_web_md.load()

  def detect_place_ner(self, query: str) -> List[str]:
    """Use the NER model to detect places in `query`.
        
        Raises an Exception if the NER model fails on the query.
        """
    try:
      doc = self.ner_model(query)
    except Exception as e:
      raise Exception(e)

    places_found_loc_gpe = []
    places_found_fac = []
    for e in doc.ents:
      # Preference is given to LOC and GPE types over FAC.
      # List of entity types recognized by the spaCy library
      # is here: https://towardsdatascience.com/explorations-in-named-entity-recognition-and-was-eleanor-roosevelt-right-671271117218
      # We only use the location/place types.
      if e.label_ in ["GPE", "LOC"]:
        places_found_loc_gpe.append(str(e))
      if e.label_ in ["FAC"]:
        places_found_fac.append(str(e))

    if places_found_loc_gpe:
      return places_found_loc_gpe
    return places_found_fac

  def detect_places_heuristics(self, query: str) -> List[str]:
    """Returns all strings in the `query` detectd as places."""

    # Run through all heuristics (various query string transforms).
    query = nl_utils.remove_punctuations(query)
    query_without_stop_words = nl_utils.remove_stop_words(
        query, nl_constants.STOP_WORDS)
    query_with_period = query + "."
    query_title_case = query.title()

    # TODO: work on finding a better fix for important places which are
    # not getting detected.
    # First check in special places. If they are found, add those first.
    places_found = []
    for special_place in nl_constants.SPECIAL_PLACES:
      if special_place in query_without_stop_words:
        logging.info(f"Found one of the Special Places: {special_place}")
        places_found.append(special_place)

    # Now try all versions of the query.
    for q in [
        query, query_without_stop_words, query_with_period, query_title_case
    ]:
      try:
        for p in self.detect_place_ner(q):
          # Add if not already done. Also check for the special places which get
          # added with a ", usa" appended.
          if (p.lower() not in places_found):
            places_found.append(p.lower())
      except Exception as e:
        logging.info(
            f"NER model raised an exception for query: '{q}'. Exception: {e}")
      if places_found:
        break

    return places_found
