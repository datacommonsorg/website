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

from server.lib.nl.common import constants
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartSpec
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState

#
# General utilities for retrieving stuff from past context.
#


def has_sv(uttr: Utterance) -> bool:
  if not uttr:
    return False

  if uttr.svs:
    return True

  if uttr.insight_ctx and uttr.insight_ctx.get('variables'):
    return True

  return False


def has_place(uttr: Utterance) -> bool:
  if not uttr:
    return False

  if uttr.places:
    return True

  if uttr.insight_ctx and uttr.insight_ctx.get('entities'):
    return True

  return False


def classifications_of_type_from_utterance(
    uttr: Utterance, ctype: ClassificationType) -> List[NLClassifier]:
  return [cl for cl in uttr.classifications if cl.type == ctype]


def classifications_of_type(classifications: List[NLClassifier],
                            ctype: ClassificationType) -> List[NLClassifier]:
  return [cl for cl in classifications if cl.type == ctype]


# `context_history` contains utterances in a given session.
def get_session_info(context_history: List[Dict], has_data: bool) -> Dict:
  session_info = {'items': []}
  # The first entry in context_history is the most recent.
  # Reverse the order for session_info.
  for i in range(len(context_history)):
    u = context_history[len(context_history) - 1 - i]
    if 'id' not in session_info:
      session_info['id'] = u['session_id']
    if has_data:
      s = constants.QUERY_OK
    else:
      s = constants.QUERY_FAILED
    session_info['items'].append({
        'query': u.get('query', ''),
        'insightCtx': u.get('insightCtx', {}),
        'status': s,
    })
  return session_info


#
# Base helper to add a chart spec to an utterance.
# TODO: Deprecate `attrs` by just using ChartVars.  Maybe rename it to ChartAttrs.
#
def add_chart_to_utterance(
    chart_type: ChartType,
    state: PopulateState,
    chart_vars: ChartVars,
    places: List[Place],
    primary_vs_secondary: ChartOriginType = ChartOriginType.PRIMARY_CHART
) -> bool:
  place_type = state.place_type
  if place_type and isinstance(place_type, ContainedInPlaceType):
    # TODO: What's the flow where the instance is string?
    place_type = place_type.value

  attr = {
      "class": primary_vs_secondary,
      "place_type": place_type,
      "ranking_types": state.ranking_types,
      "block_id": chart_vars.block_id,
      "include_percapita": chart_vars.include_percapita,
      "title": chart_vars.title,
      "description": chart_vars.description,
      "chart_type": chart_vars.response_type,
      "source_topic": chart_vars.source_topic
  }
  if chart_vars.skip_map_for_ranking:
    attr['skip_map_for_ranking'] = True
  if chart_vars.growth_direction != None:
    attr['growth_direction'] = chart_vars.growth_direction
  if chart_vars.growth_ranking_type != None:
    attr['growth_ranking_type'] = chart_vars.growth_ranking_type
  if chart_vars.title_suffix:
    attr['title_suffix'] = chart_vars.title_suffix
  if chart_vars.orig_sv:
    attr['orig_sv'] = chart_vars.orig_sv
  ch = ChartSpec(chart_type=chart_type,
                 svs=chart_vars.svs,
                 event=chart_vars.event,
                 places=places,
                 utterance=state.uttr,
                 attr=attr)
  state.uttr.chartCandidates.append(ch)
  state.uttr.counters.info('num_chart_candidates', 1)
  return True


def handle_contained_in_type(state: PopulateState, places: List[Place]):
  if (state.place_type == ContainedInPlaceType.DEFAULT_TYPE and
      len(places) == 1):
    state.place_type = utils.get_default_child_place_type(places[0])
    state.uttr.counters.info('contained_in_across_fallback',
                             state.place_type.value)
    return True

  if state.place_type and places:
    ptype = state.place_type
    state.place_type = utils.admin_area_equiv_for_place(ptype, places[0])
    if ptype != state.place_type:
      state.uttr.counters.info('contained_in_admin_area_equivalent',
                               (ptype, state.place_type))

    if places[0].place_type == state.place_type.value:
      state.uttr.counters.err('contained_in_sameplacetype',
                              state.place_type.value)
      return False

  return True


def get_default_contained_in_place(places: List[Place],
                                   place_type: ContainedInPlaceType) -> Place:
  if places:
    return None
  if not place_type:
    # For a non-contained-in-place query, default to USA.
    return constants.USA
  ptype = place_type
  if isinstance(ptype, str):
    ptype = ContainedInPlaceType(ptype)
  return constants.DEFAULT_PARENT_PLACES.get(ptype, None)
