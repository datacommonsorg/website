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
  ranking_classification = heuristic_classifiers.ranking(query)
  comparison_classification = heuristic_classifiers.comparison(query)
  correlation_classification = heuristic_classifiers.correlation(query)
  overview_classification = heuristic_classifiers.overview(query)
  size_type_classification = heuristic_classifiers.size_type(query)
  time_delta_classification = heuristic_classifiers.time_delta(query)
  contained_in_classification = heuristic_classifiers.containedin(query)
  event_classification = heuristic_classifiers.event(query)
  quantity_classification = \
    heuristic_classifiers.quantity(query, counters)
  logging.info(f'Ranking classification: {ranking_classification}')
  logging.info(f'Comparison classification: {comparison_classification}')
  logging.info(f'Correlation classification: {correlation_classification}')
  logging.info(f'SizeType classification: {size_type_classification}')
  logging.info(f'TimeDelta classification: {time_delta_classification}')
  logging.info(f'ContainedIn classification: {contained_in_classification}')
  logging.info(f'Event Classification: {event_classification}')
  logging.info(f'Overview classification: {overview_classification}')
  logging.info(f'Quantity classification: {quantity_classification}')

  # Set the Classifications list.
  classifications = []
  if ranking_classification is not None:
    classifications.append(ranking_classification)
  if comparison_classification is not None:
    classifications.append(comparison_classification)
  if contained_in_classification is not None:
    classifications.append(contained_in_classification)
  if size_type_classification is not None:
    classifications.append(size_type_classification)
  if time_delta_classification is not None:
    classifications.append(time_delta_classification)
  if event_classification is not None:
    classifications.append(event_classification)
  if overview_classification is not None:
    classifications.append(overview_classification)
  if quantity_classification is not None:
    classifications.append(quantity_classification)
  if correlation_classification is not None:
    classifications.append(correlation_classification)

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
