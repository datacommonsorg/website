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

from typing import Dict

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection import heuristic_classifiers
from server.lib.nl.detection import place
from server.lib.nl.detection import utils as dutils
from server.lib.nl.detection import variable
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import DetectionArgs
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import SimpleClassificationAttributes
from server.lib.nl.explore import params
from server.lib.nl.explore.params import QueryMode

TOOLFORMER_QUERY_REPLACEMENTS = {"residents": "people"}


def detect(orig_query: str, cleaned_query: str,
           query_detection_debug_logs: Dict, counters: Counters,
           dargs: DetectionArgs) -> Detection:
  place_detection = place.detect_from_query_dc(orig_query,
                                               query_detection_debug_logs,
                                               dargs.allow_triples)

  query = place_detection.query_without_place_substr

  # Step 3: find query classifiers.
  classifications = [
      heuristic_classifiers.ranking(query),
      heuristic_classifiers.comparison(query),
      heuristic_classifiers.containedin(query),
      heuristic_classifiers.superlative_type(query),
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
      heuristic_classifiers.date(query, counters),
      heuristic_classifiers.general(query, ClassificationType.TEMPORAL,
                                    "Temporal")
  ]

  if dargs.mode == QueryMode.STRICT:
    classifications.append(heuristic_classifiers.detailed_action(query))

  # Set the Classifications list.
  classifications = [c for c in classifications if c is not None]

  if not classifications:
    # if not classification is found, it should default to UNKNOWN (not SIMPLE)
    classifications.append(
        NLClassifier(type=ClassificationType.UNKNOWN,
                     attributes=SimpleClassificationAttributes()))

  # Step 4: Identify the SV matched based on the query.
  sv_detection_query = dutils.remove_date_from_query(query, classifications)
  # If in toolformer mode, further process the query by replacing strings in
  # the query
  if (params.is_toolformer_mode(dargs.mode)):
    sv_detection_query = dutils.replace_strings_in_query(
        query, TOOLFORMER_QUERY_REPLACEMENTS)
  sv_detection_result = dutils.empty_var_detection_result()
  try:
    sv_detection_result = variable.detect_vars(
        orig_query=sv_detection_query,
        debug_logs=query_detection_debug_logs["query_transformations"],
        dargs=dargs)
  except ValueError as e:
    counters.err('detect_vars_value_error', {
        'q': sv_detection_query,
        'err': str(e)
    })
  # Set the SVDetection.
  sv_threshold_override = params.sv_threshold_override(dargs)
  sv_detection = dutils.create_sv_detection(sv_detection_query,
                                            sv_detection_result,
                                            sv_threshold_override,
                                            dargs.allow_triples)

  return Detection(original_query=orig_query,
                   cleaned_query=cleaned_query,
                   places_detected=place_detection,
                   svs_detected=sv_detection,
                   classifications=classifications,
                   detector=ActualDetectorType.Heuristic)
