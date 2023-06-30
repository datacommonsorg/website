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
"""Router for detection."""

from typing import Dict

from flask import current_app
from markupsafe import escape

from server.lib.nl.common.counters import Counters
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection import heuristic_detector
from server.lib.nl.detection import llm_detector
from server.lib.nl.detection import llm_fallback
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import RequestedDetectorType

_PALM_API_DETECTORS = [
    RequestedDetectorType.LLM.value,
    RequestedDetectorType.Hybrid.value,
]


def detect(detector_type: str, original_query: str, no_punct_query: str,
           prev_utterance: Utterance, embeddings_index_type: str,
           query_detection_debug_logs: Dict, counters: Counters):
  if (detector_type in _PALM_API_DETECTORS and
      'PALM_API_KEY' not in current_app.config):
    counters.err('failed_palm_keynotfound', '')
    detector_type = RequestedDetectorType.Heuristic.value

  if detector_type == RequestedDetectorType.LLM.value:
    query_detection = llm_detector.detect(original_query, prev_utterance,
                                          embeddings_index_type,
                                          query_detection_debug_logs, counters)
  else:
    query_detection = heuristic_detector.detect(str(escape(original_query)),
                                                no_punct_query,
                                                embeddings_index_type,
                                                query_detection_debug_logs,
                                                counters)
    if detector_type == RequestedDetectorType.Hybrid.value:
      if llm_fallback.need_llm(query_detection, prev_utterance, counters):
        counters.err('warning_llm_fallback', '')
        query_detection = llm_detector.detect(original_query, prev_utterance,
                                              embeddings_index_type,
                                              query_detection_debug_logs,
                                              counters)
        query_detection.detector = ActualDetectorType.HybridLLM.value
      else:
        query_detection.detector = ActualDetectorType.HybridHeuristic.value

  return query_detection
