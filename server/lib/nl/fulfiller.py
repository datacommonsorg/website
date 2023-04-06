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

from server.lib.nl import constants
from server.lib.nl import counters as ctr
from server.lib.nl.detection import Detection
from server.lib.nl.fulfillment import context
import server.lib.nl.fulfillment.handlers as handlers
from server.lib.nl.utterance import QueryType
from server.lib.nl.utterance import Utterance
from shared.lib import variables as vars

# We will ignore SV detections that are below this threshold
_SV_THRESHOLD = 0.5


#
# Compute a new Utterance given the classifications for a user query
# and past utterances.
#
def fulfill(query_detection: Detection, currentUtterance: Utterance,
            counters: ctr.Counters, session_id: str) -> Utterance:

  filtered_svs = filter_svs(query_detection.svs_detected.sv_dcids,
                            query_detection.svs_detected.sv_scores, counters)

  multi_svs = vars.dict_to_multivar_candidates(
      query_detection.svs_detected.multi_sv)

  # Construct Utterance datastructure.
  uttr = Utterance(prev_utterance=currentUtterance,
                   query=query_detection.original_query,
                   query_type=QueryType.UNKNOWN,
                   detection=query_detection,
                   places=[],
                   classifications=query_detection.classifications,
                   svs=filtered_svs,
                   chartCandidates=[],
                   rankedCharts=[],
                   answerPlaces=[],
                   counters=counters,
                   session_id=session_id,
                   multi_svs=multi_svs)
  uttr.counters.info('filtered_svs', filtered_svs)

  # Add detected places.
  if (query_detection.places_detected) and (
      query_detection.places_detected.places_found):
    uttr.places.extend(query_detection.places_detected.places_found)

  query_types = [handlers.first_query_type(uttr)]
  while query_types[-1] != None:
    if fulfill_query_type(uttr, query_types[-1]):
      break
    query_types.append(handlers.next_query_type(query_types))

  rank_charts(uttr)
  return uttr


def fulfill_query_type(uttr: Utterance, query_type: QueryType) -> bool:
  # Reset previous state
  uttr.query_type = query_type
  uttr.chartCandidates = []

  # If we could not detect query_type from user-query, infer from past context.
  if (uttr.query_type == QueryType.UNKNOWN):
    uttr.query_type = context.query_type_from_context(uttr)

  found = False

  # Each query-type has its own handler. Each knows what arguments it needs and
  # will call on the *_from_context() routines to obtain missing arguments.
  handler = handlers.QUERY_HANDLERS.get(query_type, None)
  if handler:
    found = handler.module.populate(uttr)
    uttr.counters.info('processed_fulfillment_types',
                       handler.module.__name__.split('.')[-1])

  return found


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
def filter_svs(sv_list: List[str], sv_score: List[float],
               counters: ctr.Counters) -> List[str]:
  # this functionality should be moved to detection.
  i = 0
  ans = []
  blocked_vars = set()
  while (i < len(sv_list)):
    if (sv_score[i] >= _SV_THRESHOLD):
      var = sv_list[i]

      # Check if an earlier var blocks this var.
      if var in blocked_vars:
        counters.info("blocked_vars", var)
        i += 1
        continue
      ans.append(var)

      # If this var should block some vars,
      # add them to the blocked_vars set.
      if var in constants.SV_BLOCKS_MAP:
        blocked_vars.update(constants.SV_BLOCKS_MAP[var])
    i += 1
  return ans
