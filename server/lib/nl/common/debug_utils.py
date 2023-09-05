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

from typing import Dict, List

from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import GeneralClassificationAttributes
from shared.lib import detected_variables as dvars


def _empty_svs_score_dict():
  return {"SV": [], "CosineScore": [], "SV_to_Sentences": {}}


def result_with_debug_info(data_dict: Dict, status: str,
                           query_detection: Detection, debug_counters: Dict,
                           query_detection_debug_logs: str) -> Dict:
  """Using data_dict and query_detection, format the dictionary response."""
  svs_dict = {
      'SV':
          query_detection.svs_detected.single_sv.svs,
      'CosineScore':
          query_detection.svs_detected.single_sv.scores,
      'SV_to_Sentences':
          query_detection.svs_detected.single_sv.sv2sentences,
      'MultiSV':
          dvars.multivar_candidates_to_dict(
              query_detection.svs_detected.multi_sv),
  }
  svs_to_sentences = query_detection.svs_detected.single_sv.sv2sentences

  if svs_dict is None or not svs_dict:
    svs_dict = _empty_svs_score_dict()

  ranking_classification = "<None>"
  general_classification = "<None>"
  superlative_classification = "<None>"
  time_delta_classification = "<None>"
  comparison_classification = "<None>"
  contained_in_classification = "<None>"
  correlation_classification = "<None>"
  clustering_classification = "<None>"
  event_classification = "<None>"
  quantity_classification = "<None>"

  general_parts = []
  for classification in query_detection.classifications:
    if classification.type == ClassificationType.RANKING:
      ranking_classification = str(classification.attributes.ranking_type)
    elif classification.type == ClassificationType.SUPERLATIVE:
      superlative_classification = str(classification.attributes.superlatives)
    elif classification.type == ClassificationType.TIME_DELTA:
      time_delta_classification = str(
          classification.attributes.time_delta_types)
    elif classification.type == ClassificationType.EVENT:
      event_classification = str(classification.attributes.event_types)
    elif classification.type == ClassificationType.COMPARISON:
      comparison_classification = 'DETECTED'
    elif classification.type == ClassificationType.CONTAINED_IN:
      contained_in_classification = \
          str(classification.attributes.contained_in_place_type)
    elif classification.type == ClassificationType.CORRELATION:
      correlation_classification = 'DETECTED'
    elif classification.type == ClassificationType.QUANTITY:
      quantity_classification = str(classification.attributes)
    elif isinstance(classification.attributes, GeneralClassificationAttributes):
      typ = None
      if classification.type == ClassificationType.OVERVIEW:
        typ = 'Overview'
      elif classification.type == ClassificationType.ANSWER_PLACES_REFERENCE:
        typ = 'Answer Places Reference'
      elif classification.type == ClassificationType.PER_CAPITA:
        typ = 'Per Capita'
      if typ:
        general_parts.append(typ)

  if general_parts:
    general_classification = ' | '.join(general_parts)

  debug_info = {
      'status': status,
      'original_query': query_detection.original_query,
      'detection_type': query_detection.detector,
      'llm_api_type': query_detection.llm_api,
      'place_detection_type': query_detection.place_detector,
      'sv_matching': svs_dict,
      'svs_to_sentences': svs_to_sentences,
      'ranking_classification': ranking_classification,
      'general_classification': general_classification,
      'superlative_classification': superlative_classification,
      'time_delta_classification': time_delta_classification,
      'contained_in_classification': contained_in_classification,
      'clustering_classification': clustering_classification,
      'comparison_classification': comparison_classification,
      'correlation_classification': correlation_classification,
      'event_classification': event_classification,
      'quantity_classification': quantity_classification,
      'counters': debug_counters,
  }

  places_found_formatted = ""
  for place in query_detection.places_detected.places_found:
    places_found_formatted += f"(name: {place.name}, dcid: {place.dcid}); "

  debug_info.update({
      'places_detected':
          query_detection.places_detected.query_places_mentioned,
      'places_resolved':
          places_found_formatted,
      'query_with_places_removed':
          query_detection.places_detected.query_without_place_substr,
      'query_detection_debug_logs':
          query_detection_debug_logs,
  })

  if query_detection.places_detected.main_place:
    debug_info.update({
        'main_place_dcid': query_detection.places_detected.main_place.dcid,
        'main_place_name': query_detection.places_detected.main_place.name,
    })
  else:
    debug_info.update({
        'main_place_dcid': "<None>",
        'main_place_name': "<None>",
    })
  data_dict['debug'] = debug_info
  return data_dict
