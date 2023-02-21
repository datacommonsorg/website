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
"""Managing the NER model for place detection."""

from typing import List

import en_core_web_lg


class NERPlaces:

  def __init__(self) -> None:
    self.ner_model = en_core_web_lg.load()

  def detect_places_ner(self, query: str) -> List[str]:
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
        places_found_loc_gpe.append(str(e).lower())
      if e.label_ in ["FAC"]:
        places_found_fac.append(str(e).lower())

    if places_found_loc_gpe:
      return places_found_loc_gpe
    return places_found_fac
