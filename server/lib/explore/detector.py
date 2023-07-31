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

#
# This is a detector that consumes the core NL detection results plus
# context, and produces updated results in Explore args dict.
#

import copy
from enum import Enum
from typing import Dict, List

import server.lib.nl.common.topic as topic
import server.lib.nl.common.utils as utils
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.detection.types import ClassificationType
import server.lib.nl.detection.utils as dutils
from server.lib.nl.fulfillment.handlers import route_comparison_or_correlation

_MAX_RETURNED_VARS = 10


class Params(str, Enum):
  ENTITIES = 'entities'
  VARS = 'variables'
  CHILD_TYPE = 'childEntityType'
  CMP_ENTITIES = 'comparisonEntities'
  CMP_VARS = 'comparisonVariables'
  SESSION_ID = 'sessionId'
  CTX = 'context'


def detect_with_context(uttr: nl_uttr.Utterance) -> Dict:
  data_dict = {}

  # 0. Hoist any topic thats in the top-N
  _hoist_topic(uttr.svs)

  # 1. Get past places.
  past_ctx = {}
  if uttr.prev_utterance:
    past_ctx = uttr.prev_utterance.insight_ctx

  # 2. Route comparison vs. correlation query.
  query_type = None
  cl_type = _get_comparison_or_correlation(uttr)
  if cl_type != None:
    query_type = route_comparison_or_correlation(cl_type, uttr)

  # 3. Detect places (and comparison type) leveraging context.
  places, cmp_places = _detect_places(
      uttr, past_ctx, query_type == nl_uttr.QueryType.COMPARISON_ACROSS_PLACES)

  # 4. Detect SVs leveraging context.
  vars, cmp_vars = _detect_vars(
      uttr, past_ctx, query_type == nl_uttr.QueryType.CORRELATION_ACROSS_VARS)

  # 5. Populate the returned dict
  data_dict.update({
      Params.ENTITIES.value: places,
      Params.VARS.value: vars[:_MAX_RETURNED_VARS],
      Params.SESSION_ID: uttr.session_id,
      Params.CMP_ENTITIES.value: cmp_places,
      Params.CMP_VARS.value: cmp_vars[:_MAX_RETURNED_VARS],
  })
  place_type = utils.get_contained_in_type(uttr)
  if place_type:
    data_dict[Params.CHILD_TYPE.value] = place_type.value

  # 6. Set the detected params in uttr ctx and clear past contexts.
  uttr.insight_ctx = copy.deepcopy(data_dict)
  uttr.prev_utterance = None

  data_dict[Params.CTX.value] = nl_uttr.save_utterance(uttr)
  return data_dict


def _detect_vars(uttr: nl_uttr.Utterance, past_ctx: Dict,
                 is_cmp: bool) -> List[str]:
  svs = []
  cmp_svs = []
  if is_cmp:
    # Comparison
    if dutils.is_multi_sv(uttr.detection):
      svs, cmp_svs = _get_multi_sv_pair(uttr)
    else:
      if uttr.svs and past_ctx.get(Params.VARS.value):
        svs = uttr.svs
        cmp_svs = past_ctx[Params.VARS.value]
  else:
    # No comparison.
    if uttr.svs:
      svs = uttr.svs
    else:
      # Try to get svs from context.
      svs = past_ctx.get(Params.VARS.value, [])
      uttr.counters.info('insight_var_ctx', svs)

  return svs, cmp_svs


def _get_comparison_or_correlation(
    uttr: nl_uttr.Utterance) -> ClassificationType:
  for cl in uttr.classifications:
    if cl.type in [
        ClassificationType.COMPARISON, ClassificationType.CORRELATION
    ]:
      return cl.type
  return None


def _get_multi_sv_pair(uttr: nl_uttr.Utterance) -> List[str]:
  parts = dutils.get_multi_sv_pair(uttr.detection)
  if not parts or len(parts) != 2:
    return []
  _hoist_topic(parts[0].svs)
  _hoist_topic(parts[1].svs)
  return parts[0].svs, parts[1].svs


#
# A topic may not often be the top-most result. In that case,
# we look for a topic for up to TOPIC_RANK_LIMIT, and hoist to top
# (This is the same limit NL interface uses for opening up topic).
#
def _hoist_topic(svs: List[str]):
  # If no SVs, or topic is already on top, return.
  if len(svs) <= 1 or utils.is_topic(svs[0]):
    return
  for i in range(1, min(len(svs), topic.TOPIC_RANK_LIMIT)):
    if utils.is_topic(svs[i]):
      t = svs[0]
      svs[0] = svs[i]
      svs[i] = t
      return


def _detect_places(uttr: nl_uttr.Utterance, past_ctx: Dict,
                   is_cmp: bool) -> List[str]:
  places = []
  cmp_places = []
  if is_cmp:
    if len(uttr.places) > 1:
      # Completely in this query.
      # Note: Pick the last place as the main place (to be
      # consistent with the HACK further below).
      places = [uttr.places[-1].dcid]
      cmp_places = [p.dcid for p in uttr.places[:-1]]
      cmp_places.reverse()
    elif len(uttr.places) == 1:
      # Partially in this query, lookup context.
      places = [uttr.places[0].dcid]
      cmp_places = past_ctx.get(Params.ENTITIES.value, [])
      uttr.counters.info('insight_cmp_partial_place_ctx', cmp_places)
    else:
      # Completely in context.
      ctx_places = past_ctx.get(Params.ENTITIES.value, [])
      if len(ctx_places) > 1:
        places = ctx_places[:1]
        cmp_places = ctx_places[1:]
      else:
        places = ctx_places
      uttr.counters.info('insight_cmp_place_ctx', places)
  else:
    # Not comparison.
    if uttr.places:
      places = [p.dcid for p in uttr.places]
      # HACK: Reverse the list since we have a higher chance of common
      # words earlier in the query interpreted incorrectly as a place
      places.reverse()
    else:
      # Find place from context.
      places = past_ctx.get(Params.ENTITIES.value, [])
      uttr.counters.info('insight_place_ctx', places)

  return places, cmp_places
