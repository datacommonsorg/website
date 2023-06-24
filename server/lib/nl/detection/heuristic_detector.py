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

import dataclasses
import logging
from typing import Dict

from flask import current_app

import server.lib.nl.common.counters as ctr
from server.lib.nl.detection.place import get_place_from_dcids
from server.lib.nl.detection.place import infer_place_dcids
from server.lib.nl.detection.place import remove_places
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SimpleClassificationAttributes
from server.lib.nl.detection.types import SVDetection
from shared.lib import detected_variables as dvars


def _empty_svs_score_dict():
  return {"SV": [], "CosineScore": [], "SV_to_Sentences": {}, "MultiSV": {}}


def detect(orig_query: str, cleaned_query: str, index_type: str,
           query_detection_debug_logs: Dict,
           counters: ctr.Counters) -> Detection:
  model = current_app.config['NL_MODEL']

  # Step 1: find all relevant places and the name/type of the main place found.
  places_str_found = model.detect_place(cleaned_query)

  if not places_str_found:
    logging.info("Place detection failed.")

  logging.info("Found places in query: {}".format(places_str_found))

  query = cleaned_query
  place_dcids = []
  main_place = None
  resolved_places = []

  # Start updating the query_detection_debug_logs. Create space for place dcid inference
  # and place resolution. If they remain empty, the function belows were never triggered.
  query_detection_debug_logs["place_dcid_inference"] = {}
  query_detection_debug_logs["place_resolution"] = {}
  # Look to find place DCIDs.
  if places_str_found:
    place_dcids = infer_place_dcids(
        places_str_found, query_detection_debug_logs["place_dcid_inference"])
    logging.info(f"Found {len(place_dcids)} place dcids: {place_dcids}.")

  if place_dcids:
    resolved_places = get_place_from_dcids(
        place_dcids.values(), query_detection_debug_logs["place_resolution"])
    logging.info(
        f"Resolved {len(resolved_places)} place dcids: {resolved_places}.")

    # Step 2: replace the place strings with "" if place_dcids were found.
    # Typically, this could also be done under the check for resolved_places
    # but we don't expected the resolution from place dcids to fail (typically).
    # Also, even if the resolution fails, if there is a place dcid found, it should
    # be considered good enough to remove the place strings.
    query = remove_places(cleaned_query.lower(), place_dcids)

  if resolved_places:
    main_place = resolved_places[0]
    logging.info(f"Using main_place as: {main_place}")

  # Set PlaceDetection.
  place_detection = PlaceDetection(query_original=orig_query,
                                   query_without_place_substr=query,
                                   query_places_mentioned=places_str_found,
                                   places_found=resolved_places,
                                   main_place=main_place)

  # Update the various place detection and query transformation debug logs dict.
  query_detection_debug_logs["places_found_str"] = places_str_found
  query_detection_debug_logs["main_place_inferred"] = dataclasses.asdict(
      main_place)
  query_detection_debug_logs["query_transformations"] = {
      "place_detection_input": cleaned_query.lower(),
      "place_detection_with_places_removed": query,
  }
  if not query_detection_debug_logs["place_dcid_inference"]:
    query_detection_debug_logs[
        "place_dcid_inference"] = "Place DCID Inference did not trigger (no place strings found)."
  if not query_detection_debug_logs["place_resolution"]:
    query_detection_debug_logs[
        "place_resolution"] = "Place resolution did not trigger (no place dcids found)."

  # Step 3: Identify the SV matched based on the query.
  svs_scores_dict = _empty_svs_score_dict()
  try:
    svs_scores_dict = model.detect_svs(
        query, index_type, query_detection_debug_logs["query_transformations"])
  except ValueError as e:
    logging.info(e)
    logging.info("Using an empty svs_scores_dict")

  # Set the SVDetection.
  sv_detection = SVDetection(
      query=query,
      single_sv=dvars.VarCandidates(
          svs=svs_scores_dict['SV'],
          scores=svs_scores_dict['CosineScore'],
          sv2sentences=svs_scores_dict['SV_to_Sentences']),
      multi_sv=dvars.dict_to_multivar_candidates(svs_scores_dict['MultiSV']))

  # Step 4: find query classifiers.
  ranking_classification = model.heuristic_ranking_classification(query)
  comparison_classification = model.heuristic_comparison_classification(query)
  correlation_classification = model.heuristic_correlation_classification(query)
  overview_classification = model.heuristic_overview_classification(query)
  size_type_classification = model.heuristic_size_type_classification(query)
  time_delta_classification = model.heuristic_time_delta_classification(query)
  contained_in_classification = model.heuristic_containedin_classification(
      query)
  event_classification = model.heuristic_event_classification(query)
  quantity_classification = \
    model.heuristic_quantity_classification(query, counters)
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
                   classifications=classifications)
