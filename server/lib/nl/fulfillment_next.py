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

from lib.nl import utils
from lib.nl.detection import ClassificationType
from lib.nl.detection import Detection
from lib.nl.fulfillment import comparison
from lib.nl.fulfillment import containedin
from lib.nl.fulfillment import context
from lib.nl.fulfillment import correlation
from lib.nl.fulfillment import event
from lib.nl.fulfillment import ranking_across_places
from lib.nl.fulfillment import ranking_across_vars
from lib.nl.fulfillment import simple
from lib.nl.fulfillment import time_delta
from lib.nl.utterance import Utterance

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
                   query_type=query_detection.query_type,
                   detection=query_detection,
                   places=[],
                   classifications=query_detection.classifications,
                   svs=filtered_svs,
                   chartCandidates=[],
                   rankedCharts=[],
                   answerPlaces=[])
  uttr.counters['filtered_svs'] = filtered_svs

  # If we could not detect query_type from user-query, infer from past context.
  if (uttr.query_type == ClassificationType.UNKNOWN):
    uttr.query_type = context.query_type_from_context(uttr)

  # Add detected places.
  if (query_detection.places_detected):
    uttr.places.append(query_detection.places_detected.main_place)

  logging.info('Handled query_type: %d', uttr.query_type.value)
  fulfillment_type = 'UNHANDLED - ' + str(uttr.query_type.value)

  # Each query-type has its own handler. Each knows what arguments it needs and
  # will call on the *_from_context() routines to obtain missing arguments.
  if (uttr.query_type == ClassificationType.SIMPLE):
    fulfillment_type = 'SIMPLE'
    simple.populate(uttr)
  elif (uttr.query_type == ClassificationType.CORRELATION):
    fulfillment_type = 'CORRELATION'
    correlation.populate(uttr)
  elif (uttr.query_type == ClassificationType.CONTAINED_IN):
    fulfillment_type = 'CONTAINED_IN'
    containedin.populate(uttr)
  elif (uttr.query_type == ClassificationType.RANKING):
    current_contained_classification = context.classifications_of_type_from_utterance(
        uttr, ClassificationType.CONTAINED_IN)
    if current_contained_classification:
      fulfillment_type = 'RANKING_ACROSS_PLACES'
      ranking_across_places.populate(uttr)
    else:
      fulfillment_type = 'RANKING_ACROSS_VARS'
      ranking_across_vars.populate(uttr)
  elif (uttr.query_type == ClassificationType.COMPARISON):
    fulfillment_type = 'COMPARISON'
    comparison.populate(uttr)
  elif (uttr.query_type == ClassificationType.EVENT):
    fulfillment_type = 'EVENT'
    event.populate(uttr)
  elif (uttr.query_type == ClassificationType.TIME_DELTA):
    fulfillment_type = 'TIME_DELTA'
    time_delta.populate(uttr)

  uttr.counters['fulfillment_type'] = fulfillment_type
  rank_charts(uttr)
  return uttr


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
