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
from typing import Dict

from markupsafe import escape

import server.lib.nl.common.counters as ctr
import server.lib.nl.common.debug_utils as dbg
from server.lib.nl.detection import utils as dutils
from server.lib.nl.detection.types import Detection
import shared.lib.utils as shared_utils


#
# Preliminary abort with the given error message
#
def abort(error_message: str, original_query: str,
          context_history: Dict) -> Dict:
  query = str(escape(shared_utils.remove_punctuations(original_query)))
  escaped_context_history = []
  for ch in context_history:
    escaped_context_history.append(escape(ch))

  res = {
      'place': {
          'dcid': '',
          'name': '',
          'place_type': '',
      },
      'config': {},
      'context': escaped_context_history,
      'failure': error_message
  }

  counters = ctr.Counters()
  query_detection_debug_logs = {}
  query_detection_debug_logs["original_query"] = query

  query_detection = Detection(original_query=original_query,
                              cleaned_query=query,
                              places_detected=dutils.empty_place_detection(),
                              svs_detected=dutils.create_sv_detection(
                                  query, dutils.empty_svs_score_dict()),
                              classifications=[],
                              llm_resp={})
  data_dict = dbg.result_with_debug_info(
      data_dict=res,
      status=error_message,
      query_detection=query_detection,
      debug_counters=counters.get(),
      query_detection_debug_logs=query_detection_debug_logs)
  logging.info('NL Data API: Empty Exit')
  return data_dict
