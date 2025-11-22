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

import logging

from server.lib.nl.common import counters
from server.lib.nl.detection.agent.types import AgentDetection
from server.lib.nl.detection.agent.types import \
    ClassificationType as AgentClassificationType
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection
from shared.lib.detected_variables import MultiVarCandidates
from shared.lib.detected_variables import SentenceScore
from shared.lib.detected_variables import VarCandidates

# Mapping from AgentClassificationType to ClassificationType
AGENT_TO_NL_CLASSIFICATION_MAP = {
    AgentClassificationType.SIMPLE:
        ClassificationType.SIMPLE,
    AgentClassificationType.RANKING:
        ClassificationType.RANKING,
    AgentClassificationType.QUANTITY:
        ClassificationType.QUANTITY,
    AgentClassificationType.CONTAINED_IN:
        ClassificationType.CONTAINED_IN,
    AgentClassificationType.CORRELATION:
        ClassificationType.CORRELATION,
    AgentClassificationType.COMPARISON:
        ClassificationType.COMPARISON,
    AgentClassificationType.TIME_DELTA:
        ClassificationType.TIME_DELTA,
    AgentClassificationType.EVENT:
        ClassificationType.EVENT,
    AgentClassificationType.OVERVIEW:
        ClassificationType.OVERVIEW,
    AgentClassificationType.SUPERLATIVE:
        ClassificationType.SUPERLATIVE,
    AgentClassificationType.DATE:
        ClassificationType.DATE,
    AgentClassificationType.ANSWER_PLACES_REFERENCE:
        ClassificationType.ANSWER_PLACES_REFERENCE,
    AgentClassificationType.PER_CAPITA:
        ClassificationType.PER_CAPITA,
    AgentClassificationType.DETAILED_ACTION:
        ClassificationType.DETAILED_ACTION,
    AgentClassificationType.TEMPORAL:
        ClassificationType.TEMPORAL,
    AgentClassificationType.UNKNOWN:
        ClassificationType.UNKNOWN,
    AgentClassificationType.OTHER:
        ClassificationType.OTHER,
}


def _map_classification(classification_str: str) -> list[NLClassifier]:
  """Maps the agent classification string to a list of NLClassifiers."""
  try:
    # Validate and get the enum member
    agent_classification_type = AgentClassificationType(classification_str)
  except ValueError as e:
    # Log the error for troubleshooting
    logging.error(
        f"Invalid classification type received: '{classification_str}'. Error: {e}"
    )
    return []

  target_class_type = AGENT_TO_NL_CLASSIFICATION_MAP.get(
      agent_classification_type, ClassificationType.UNKNOWN)

  return [NLClassifier(type=target_class_type, attributes={})]


def convert_agent_detection_to_detection(agent_detection: AgentDetection,
                                         query: str,
                                         ctr: counters.Counters) -> Detection:
  """Converts an AgentDetection object to a Detection object."""

  # 1. Map Places
  places_found = []
  if agent_detection.places:
    for p in agent_detection.places:
      places_found.append(
          Place(dcid=p.dcid, name=p.name, place_type=p.place_type))

  place_detection = PlaceDetection(
      query_original=query,
      query_without_place_substr=query,  # TODO: Logic to remove place substring?
      query_places_mentioned=[],  # TODO: Extract mentioned places
      query_entities_mentioned=[],
      places_found=places_found,
      entities_found=[],
      main_place=None,
      parent_places=[])

  # 2. Map Indicators (SVs)
  svs = []
  scores = []
  svs_to_sentences = {}
  if agent_detection.indicators:
    for sv, name in agent_detection.indicators.items():
      svs.append(sv)
      scores.append(1.0)  # Default score
      svs_to_sentences[sv] = [SentenceScore(sentence=name, score=1.0)]

  single_sv = VarCandidates(svs=svs,
                            scores=scores,
                            sv2sentences=svs_to_sentences)
  prop = VarCandidates(svs=[], scores=[], sv2sentences={})
  multi_sv = MultiVarCandidates(candidates=[])

  sv_detection = SVDetection(
      query=query,
      single_sv=single_sv,
      prop=prop,
      multi_sv=multi_sv,
      sv_threshold=0.5,  # Dummy threshold
      model_threshold=0.5  # Dummy threshold
  )

  # 3. Map Classifications
  classifications = _map_classification(agent_detection.classification)

  return Detection(original_query=query,
                   cleaned_query=query,
                   places_detected=place_detection,
                   svs_detected=sv_detection,
                   classifications=classifications,
                   llm_resp={},
                   detector="Agent")
