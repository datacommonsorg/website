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
"""Module for NL page data spec"""

import logging
from typing import List

from server.lib.nl import utils
from server.lib.nl.detection import ClassificationType
from server.lib.nl.detection import Detection
from server.lib.nl.detection import NLClassifier
from server.lib.nl.detection import QUERY_TYPE_FALLBACK
from server.lib.nl.detection import RANKED_CLASSIFICATION_TYPES
from server.lib.nl.fulfillment import comparison
from server.lib.nl.fulfillment import containedin
from server.lib.nl.fulfillment import context
from server.lib.nl.fulfillment import correlation
from server.lib.nl.fulfillment import event
from server.lib.nl.fulfillment import overview
from server.lib.nl.fulfillment import ranking_across_places
from server.lib.nl.fulfillment import ranking_across_vars
from server.lib.nl.fulfillment import simple
from server.lib.nl.fulfillment import time_delta
from server.lib.nl.utterance import Utterance

# We will ignore SV detections that are below this threshold
_SV_THRESHOLD = 0.5


#
# Compute a new Utterance given the classifications for a user query
# and past utterances.
#
def fulfill(query_detection: Detection,
            currentUtterance: Utterance) -> Utterance:

  filtered_svs = filter_svs(query_detection.svs_detected.sv_dcids,
                            query_detection.svs_detected.sv_scores)

  # Construct Utterance datastructure.
  uttr = Utterance(prev_utterance=currentUtterance,
                   query=query_detection.original_query,
                   query_type=ClassificationType.UNKNOWN,
                   detection=query_detection,
                   places=[],
                   classifications=query_detection.classifications,
                   svs=filtered_svs,
                   chartCandidates=[],
                   rankedCharts=[],
                   answerPlaces=[])
  uttr.counters['filtered_svs'] = filtered_svs

  # Add detected places.
  if (query_detection.places_detected):
    uttr.places.append(query_detection.places_detected.main_place)

  query_type = None
  while True:
    query_type = _get_next_query_type(query_detection.classifications,
                                      query_type)
    if query_type == None:
      break
    if fulfill_for_query_type(query_detection, uttr, query_type):
      rank_charts(uttr)
      break
  return uttr


def fulfill_for_query_type(query_detection: Detection, uttr: Utterance,
                           query_type: ClassificationType) -> bool:
  logging.info('Handled query_type: %d', uttr.query_type.value)
  # Reset previous state
  uttr.query_type = query_type
  uttr.chartCandidates = []

  # If we could not detect query_type from user-query, infer from past context.
  if (uttr.query_type == ClassificationType.UNKNOWN):
    uttr.query_type = context.query_type_from_context(uttr)

  found = False
  # Each query-type has its own handler. Each knows what arguments it needs and
  # will call on the *_from_context() routines to obtain missing arguments.
  if (uttr.query_type == ClassificationType.OVERVIEW):
    if not uttr.svs:
      # We detected some overview words ("tell me about") *and* there were
      # no SVs in current utterance, so consider it a place overview.
      fulfillment_type = 'OVERVIEW'
      found = overview.populate(uttr)
    else:
      fulfillment_type = 'SIMPLE'
      found = simple.populate(uttr)
  elif (uttr.query_type == ClassificationType.SIMPLE):
    fulfillment_type = 'SIMPLE'
    found = simple.populate(uttr)
  elif (uttr.query_type == ClassificationType.CORRELATION):
    fulfillment_type = 'CORRELATION'
    found = correlation.populate(uttr)
  elif (uttr.query_type == ClassificationType.CONTAINED_IN):
    fulfillment_type = 'CONTAINED_IN'
    found = containedin.populate(uttr)
  elif (uttr.query_type == ClassificationType.RANKING):
    current_contained_classification = context.classifications_of_type_from_utterance(
        uttr, ClassificationType.CONTAINED_IN)
    if current_contained_classification:
      fulfillment_type = 'RANKING_ACROSS_PLACES'
      found = ranking_across_places.populate(uttr)
    else:
      fulfillment_type = 'RANKING_ACROSS_VARS'
      found = ranking_across_vars.populate(uttr)
  elif (uttr.query_type == ClassificationType.COMPARISON):
    fulfillment_type = 'COMPARISON'
    found = comparison.populate(uttr)
  elif (uttr.query_type == ClassificationType.EVENT):
    fulfillment_type = 'EVENT'
    found = event.populate(uttr)
  elif (uttr.query_type == ClassificationType.TIME_DELTA):
    fulfillment_type = 'TIME_DELTA'
    found = time_delta.populate(uttr)

  utils.update_counter(uttr.counters, 'fulfillment_type', fulfillment_type)
  return found


def _get_next_query_type(classifications: List[NLClassifier],
                         query_type: ClassificationType) -> ClassificationType:
  if query_type == None:
    return _query_type_from_classifications(classifications)
  else:
    return QUERY_TYPE_FALLBACK.get(query_type, ClassificationType.SIMPLE)


def _query_type_from_classifications(classifications):
  ans = ClassificationType.SIMPLE
  for cl in classifications:
    if (_classification_rank_order(cl.type) > _classification_rank_order(ans)):
      ans = cl.type
  return ans


def _classification_rank_order(cl: ClassificationType) -> int:
  if cl in RANKED_CLASSIFICATION_TYPES:
    return RANKED_CLASSIFICATION_TYPES.index(cl) + 1
  else:
    return 0


#
# Rank candidate charts in the given Utterance.
#
# TODO: Maybe improve in future.
def rank_charts(utterance: Utterance):
  for chart in utterance.chartCandidates:
    logging.info("Chart: %s %s\n" % (chart.places, chart.svs))
  utterance.rankedCharts = utterance.chartCandidates


#
# Filter out SVs that are below a score.
#
def filter_svs(sv_list: List[str], sv_score: List[float]) -> List[str]:
  # this functionality should be moved to detection.
  i = 0
  ans = []
  while (i < len(sv_list)):
    if (sv_score[i] > _SV_THRESHOLD):
      ans.append(sv_list[i])
    i = i + 1
  return ans
