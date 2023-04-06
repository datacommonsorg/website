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

from server.services import datacommons as dc
import shared.lib.utils as utils


class NLPlaceDetector:
  """Performs all place detection for the NL modules."""

  def detect_place_ner(self, query: str) -> List[str]:
    # Making an API call to the NL models server.
    return dc.nl_detect_place_ner(query)

  def detect_places_heuristics(self, query: str) -> List[str]:
    """Returns all strings in the `query` detectd as places."""

    return utils.place_detection_with_heuristics(self.detect_place_ner, query)