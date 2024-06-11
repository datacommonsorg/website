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

import copy
import os
from typing import Dict, List

from flask import current_app

from server.lib import util as libutil
from server.lib.nl.common import constants
from server.lib.nl.common import utils
from server.lib.nl.common import variable
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Entity
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from server.lib.nl.explore import params
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import ExistInfo
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.types import Sv2Place2Date
from server.lib.nl.fulfillment.types import Sv2Place2Facet

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


def has_prop(uttr: Utterance) -> bool:
  if not uttr:
    return False

  if uttr.properties:
    return True

  if uttr.insight_ctx and uttr.insight_ctx.get('properties'):
    return True

  return False


def has_entity(uttr: Utterance) -> bool:
  if not uttr:
    return False

  if uttr.places:
    return True

  if uttr.insight_ctx and uttr.insight_ctx.get('nonPlaceEntities'):
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
#
def add_chart_to_utterance(
    chart_type: ChartType,
    state: PopulateState,
    chart_vars: ChartVars,
    places: List[Place],
    primary_vs_secondary: ChartOriginType = ChartOriginType.PRIMARY_CHART,
    ranking_count: int = 0,
    sv_place_facet: Sv2Place2Facet = None,
    info_message: str = '',
    entities: List[Entity] = [],
    sv_place_latest_date: Sv2Place2Date = None) -> bool:
  is_special_dc = False
  if state.uttr.insight_ctx and params.is_special_dc(state.uttr.insight_ctx):
    is_special_dc = True
  place_type = state.place_type
  if place_type and isinstance(place_type, ContainedInPlaceType):
    # TODO: What's the flow where the instance is string?
    place_type = place_type.value
  # Make a copy of chart-vars since it change.
  ch = ChartSpec(chart_type=chart_type,
                 svs=copy.deepcopy(chart_vars.svs),
                 props=copy.deepcopy(chart_vars.props),
                 entities=copy.deepcopy(entities),
                 event=chart_vars.event,
                 places=copy.deepcopy(places),
                 chart_vars=copy.deepcopy(chart_vars),
                 place_type=place_type,
                 ranking_types=copy.deepcopy(state.ranking_types),
                 ranking_count=ranking_count,
                 chart_origin=primary_vs_secondary,
                 is_special_dc=is_special_dc,
                 single_date=state.single_date,
                 date_range=state.date_range,
                 sv_place_facet=sv_place_facet,
                 info_message=info_message,
                 sv_place_latest_date=sv_place_latest_date)
  state.uttr.chartCandidates.append(ch)
  state.uttr.counters.info('num_chart_candidates', 1)
  return True


def handle_contained_in_type(state: PopulateState, places: List[Place]):
  if (state.place_type == ContainedInPlaceType.DEFAULT_TYPE and
      len(places) == 1):
    state.place_type = utils.get_default_child_place_type(places[0])
    if state.place_type:
      state.uttr.counters.info('contained_in_across_fallback',
                               state.place_type.value)

  if state.place_type and places:
    ptype = state.place_type
    state.place_type = utils.admin_area_equiv_for_place(ptype, places[0])
    if ptype != state.place_type:
      state.uttr.counters.info('contained_in_admin_area_equivalent',
                               (ptype, state.place_type))

    if places[0].place_type == state.place_type.value:
      state.uttr.counters.err('contained_in_sameplacetype',
                              state.place_type.value)
      state.place_type = None


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


# Get facet id to use when there are sv_place_facet specified. Gets the
# facet id that has data for the most places.
def get_facet_id(sv: str, sv_place_facet: Dict[str, Dict[str, str]],
                 places: List[str]) -> str:
  if not sv_place_facet:
    return ''
  sv_facets = sv_place_facet.get(sv, {})
  facet_id_occurences = {}
  facet_id_to_use = ""
  for place in places:
    place_facet_id = sv_facets.get(place, {}).get('facetId', '')
    if not place_facet_id:
      continue
    place_facet_id_occurences = facet_id_occurences.get(place_facet_id, 0) + 1
    facet_id_occurences[place_facet_id] = place_facet_id_occurences
    if place_facet_id_occurences > facet_id_occurences.get(facet_id_to_use, 0):
      facet_id_to_use = place_facet_id
  return facet_id_to_use


def is_coplottable(svs: List[str], places: List[Place],
                   exist_checks: Dict[str, Dict[str, ExistInfo]]) -> bool:
  """"
  Function that checks if the given SVs are co-plottable in a timeline/bar.
  That's true if the SVs are all either PC/no-PC, and have the same unit.

  Args:
    chart_vars: ChartVars to be plotted.
    places: places to be plotted.
  
  Returns:
    Boolean indicating whether the SVs are co-plottable in a timeline/bar chart.
  """
  if os.environ.get('FLASK_ENV') == 'test':
    nopc_vars = libutil.get_nl_no_percapita_vars()
  else:
    nopc_vars = current_app.config['NOPC_VARS']

  # Ensure all SVs have the same per-capita relevance.
  pc_list = [variable.is_percapita_relevant(sv, nopc_vars) for sv in svs]
  if any(pc_list) and not all(pc_list):
    # Some SV is True, but not all.
    return False

  # Ensure all SVs have the same unit.
  unit = None
  for i, sv in enumerate(svs):
    sv_exist_checks = exist_checks.get(sv, {})
    for place in places:
      u = sv_exist_checks.get(place.dcid, ExistInfo()).facet.get('unit', '')
      if i > 0 and unit != u:
        return False
      unit = u

  return True


# Takes a list of place names and formats it into a single string.
def get_places_as_string(places: List[str]) -> str:
  if len(places) < 1:
    return ''
  elif len(places) == 1:
    return places[0]
  else:
    return ', '.join(places[0:len(places) - 1]) + f' and {places[-1]}'


def get_max_ans_places(places: List[Place], uttr: Utterance) -> List[Place]:
  if uttr.mode == params.QueryMode.TOOLFORMER_TABLE:
    # In toolformer table mode there is very large limit.
    return places[:constants.ABSOLUTE_MAX_PLACES_FOR_TABLES]

  return places[:constants.MAX_ANSWER_PLACES]