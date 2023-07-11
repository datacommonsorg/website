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
#
# Interface for variable detection
#

from typing import Dict, List, Union

from server.services import datacommons as dc
import shared.lib.utils as shared_utils

# TODO: decouple words removal from detected attributes. Today, the removal
# blanket removes anything that matches, including the various attribute/
# classification triggers and contained_in place types (and their plurals).
# This may not always be the best thing to do.
ALL_STOP_WORDS = shared_utils.combine_stop_words()


#
# The main entry point into SV detection. Given a query (with places removed)
# calls the NL Server and returns a dict with both single-SV and multi-SV
# (if relevant) detections.  For more details see create_sv_detection().
#
def detect_svs(query: str, index_type: str,
               debug_logs: Dict) -> Dict[str, Union[Dict, List]]:
  # Remove stop words.
  # Check comment at the top of this file above `ALL_STOP_WORDS` to understand
  # the potential areas for improvement. For now, this removal blanket removes
  # any words in ALL_STOP_WORDS which includes contained_in places and their
  # plurals and any other query attribution/classification trigger words.
  debug_logs["sv_detection_query_index_type"] = index_type
  debug_logs["sv_detection_query_input"] = query
  debug_logs["sv_detection_query_stop_words_removal"] = \
      shared_utils.remove_stop_words(query, ALL_STOP_WORDS)

  # Make API call to the NL models/embeddings server.
  return dc.nl_search_sv(query, index_type)
