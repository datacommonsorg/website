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
from server.lib.explore import params
from server.lib.nl.common import constants
from server.lib.nl.common import utils
from server.lib.nl.common import variable
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartSpec
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
#
def add_chart_to_utterance(
    chart_type: ChartType,
    state: PopulateState,
    chart_vars: ChartVars,
    places: List[Place],
    primary_vs_secondary: ChartOriginType = ChartOriginType.PRIMARY_CHART,
    ranking_count: int = 0) -> bool:
  is_sdg = False
  if state.uttr.insight_ctx and params.is_sdg(state.uttr.insight_ctx):
    is_sdg = True
  place_type = state.place_type
  if place_type and isinstance(place_type, ContainedInPlaceType):
    # TODO: What's the flow where the instance is string?
    place_type = place_type.value
  # Make a copy of chart-vars since it change.
  ch = ChartSpec(chart_type=chart_type,
                 svs=copy.deepcopy(chart_vars.svs),
                 event=chart_vars.event,
                 places=copy.deepcopy(places),
                 chart_vars=copy.deepcopy(chart_vars),
                 place_type=place_type,
                 ranking_types=copy.deepcopy(state.ranking_types),
                 ranking_count=ranking_count,
                 chart_origin=primary_vs_secondary,
                 is_sdg=is_sdg,
                 single_date=state.single_date,
                 date_range=state.date_range)
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


def is_coplottable(chart_vars: ChartVars) -> bool:
  """"
  Function that checks if the given SVs are co-plottable in a timeline/bar.
  That's true if the SVs are all either PC/no-PC, and have the same unit.

  Args:
    chart_vars: ChartVars to be plotted.
  
  Returns:
    Boolean indicating whether the SVs are co-plottable in a timeline/bar chart.
  """
  if os.environ.get('FLASK_ENV') == 'test':
    nopc_vars = libutil.get_nl_no_percapita_vars()
  else:
    nopc_vars = current_app.config['NOPC_VARS']

  svs = chart_vars.svs
  # Ensure all SVs have the same per-capita relevance.
  pc_list = [variable.is_percapita_relevant(sv, nopc_vars) for sv in svs]
  if any(pc_list) and not all(pc_list):
    # Some SV is True, but not all.
    return False

  # Ensure all SVs have the same unit.
  unit = None
  for i, sv in enumerate(svs):
    u = chart_vars.sv_exist_facet.get(sv, {}).get('unit', '')
    if i > 0 and unit != u:
      return False
    unit = u

  return True
