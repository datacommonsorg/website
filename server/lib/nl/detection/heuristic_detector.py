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
"""Heuristics based detector"""

import logging
from typing import Dict

import server.lib.nl.common.counters as ctr
from server.lib.nl.detection import heuristic_classifiers
from server.lib.nl.detection import place
from server.lib.nl.detection import utils as dutils
from server.lib.nl.detection import variable
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import PlaceDetectorType
from server.lib.nl.detection.types import SimpleClassificationAttributes


def detect(place_detector_type: PlaceDetectorType, orig_query: str,
           cleaned_query: str, index_type: str,
           query_detection_debug_logs: Dict,
           counters: ctr.Counters) -> Detection:
  if place_detector_type == PlaceDetectorType.DC:
    place_detection = place.detect_from_query_dc(orig_query,
                                                 query_detection_debug_logs)
  else:
    place_detection = place.detect_from_query_ner(cleaned_query, orig_query,
                                                  query_detection_debug_logs)

  query = place_detection.query_without_place_substr

  # Step 3: Identify the SV matched based on the query.
  svs_scores_dict = dutils.empty_svs_score_dict()
  try:
    svs_scores_dict = variable.detect_svs(
        query, index_type, query_detection_debug_logs["query_transformations"])
  except ValueError as e:
    logging.info(e)
    logging.info("Using an empty svs_scores_dict")

  # Set the SVDetection.
  sv_detection = dutils.create_sv_detection(query, svs_scores_dict)

  # Step 4: find query classifiers.
  classifications = [
      heuristic_classifiers.ranking(query),
      heuristic_classifiers.comparison(query),
      heuristic_classifiers.containedin(query),
      heuristic_classifiers.size_type(query),
      heuristic_classifiers.time_delta(query),
      heuristic_classifiers.event(query),
      heuristic_classifiers.general(query, ClassificationType.OVERVIEW,
                                    "Overview"),
      heuristic_classifiers.quantity(query, counters),
      heuristic_classifiers.correlation(query),
      heuristic_classifiers.general(query,
                                    ClassificationType.ANSWER_PLACES_REFERENCE,
                                    "AnswerPlacesReference"),
      heuristic_classifiers.general(query, ClassificationType.PER_CAPITA,
                                    "PerCapita"),
  ]

  # Set the Classifications list.
  classifications = [c for c in classifications if c is not None]

  if not classifications:
    # if not classification is found, it should default to UNKNOWN (not SIMPLE)
    classifications.append(
        NLClassifier(type=ClassificationType.UNKNOWN,
                     attributes=SimpleClassificationAttributes()))

  return Detection(original_query=orig_query,
                   cleaned_query=cleaned_query,
                   places_detected=place_detection,
                   svs_detected=sv_detection,
                   classifications=classifications,
                   detector=ActualDetectorType.Heuristic,
                   place_detector=place_detector_type)
