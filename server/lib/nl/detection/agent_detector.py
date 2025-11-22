# Copyright 2025 Google LLC
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

import asyncio

from flask import current_app

from server.lib.nl.common import utterance
from server.lib.nl.common.counters import Counters
from server.lib.nl.detection.agent.conversions import \
    convert_agent_detection_to_detection
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import DetectionArgs
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection
from shared.lib.detected_variables import MultiVarCandidates
from shared.lib.detected_variables import VarCandidates


def _create_empty_detection(query: str) -> Detection:
  """Creates an empty Detection object for fallback cases."""
  empty_place_detection = PlaceDetection(
      query_original=query,
      query_without_place_substr="",
      query_places_mentioned=[],
      query_entities_mentioned=[],
      places_found=[],
      entities_found=[],
      main_place=Place(dcid="", name="", place_type=""),
  )
  empty_svs_detection = SVDetection(query=query,
                                    single_sv=VarCandidates(svs=[],
                                                            scores=[],
                                                            sv2sentences={}),
                                    prop=VarCandidates(svs=[],
                                                       scores=[],
                                                       sv2sentences={}),
                                    multi_sv=MultiVarCandidates(candidates=[]),
                                    sv_threshold=0.0,
                                    model_threshold=0.0)

  return Detection(original_query=query,
                   cleaned_query=query,
                   places_detected=empty_place_detection,
                   svs_detected=empty_svs_detection,
                   classifications=[],
                   llm_resp={},
                   detector=ActualDetectorType.Agent)


def detect(query: str, prev_utterance: utterance.Utterance,
           query_detection_debug_logs: dict, counters: Counters,
           dargs: DetectionArgs) -> Detection:

  detection_agent = current_app.config.get('NL_DETECTION_AGENT')

  if detection_agent:
    # Run the agent detection asynchronously
    agent_detection = asyncio.run(detection_agent.detect(query))

    # Convert AgentDetection to Detection
    return convert_agent_detection_to_detection(agent_detection, query,
                                                counters)

  # Fallback: return empty detection if no agent is configured
  return _create_empty_detection(query)
