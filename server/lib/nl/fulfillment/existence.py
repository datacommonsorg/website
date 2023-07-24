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

from dataclasses import dataclass
import logging
import time
from typing import Dict, List

from server.lib.nl.common import constants
from server.lib.nl.common import topic
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState

_EVENT_PREFIX = 'event/'


#
# These are data classes to track state needed for batched existence-checks.
#
@dataclass
class ChartVarsExistenceCheckState:
  chart_vars: ChartVars
  # Existing svs from among chart_vars.svs
  # Note that `chart_vars` is not mutated to point to existing SVs.
  exist_svs: List[str]
  # Set only if chart_vars.event is true, to indicate event existence.
  exist_event: bool = False


@dataclass
class SVExistenceCheckState:
  sv: str
  chart_vars_list: List[ChartVarsExistenceCheckState]


#
# Common existence check tracker shared between main SVs and extension SVs.
#
class ExistenceCheckTracker:

  # NOTE: If sv2extensions is set, then this is for extensions only.
  def __init__(self, state: PopulateState, places: List[str]):
    self.state = state
    self.places = places
    self.all_svs = set()
    self.exist_sv_states: List[SVExistenceCheckState] = []
    # Map of existing SVs with key as SV DCID and value as
    # whether the SV has single-data point.
    self.existing_svs = {}

  def _run(self):
    # Perform batch existence check.
    if self.state.uttr.query_type == QueryType.SIMPLE:
      self.existing_svs = utils.sv_existence_for_places_check_single_point(
          self.places, list(self.all_svs), self.state.uttr.counters)
    else:
      tmp_svs = utils.sv_existence_for_places(self.places, list(self.all_svs),
                                              self.state.uttr.counters)
      self.existing_svs = {v: False for v in tmp_svs}

    if self.existing_svs:
      logging.info('Existence check succeeded for %s - %s',
                   ', '.join(self.places), ', '.join(self.existing_svs.keys()))
    else:
      logging.info('Existence check failed for %s - %s', ', '.join(self.places),
                   ', '.join(self.all_svs))
      self.state.uttr.counters.err(
          'failed_existence_check', {
              'places': self.places[:constants.DBG_LIST_LIMIT],
              'type': self.state.place_type,
              'svs': list(self.all_svs)[:constants.DBG_LIST_LIMIT],
          })

  def perform_existence_check(self):
    self._run()

    # Set "exist_svs" in the same order it was originally found.
    for es in self.exist_sv_states:

      for ecv in es.chart_vars_list:
        for sv in ecv.chart_vars.svs:
          if sv in self.existing_svs:
            ecv.exist_svs.append(sv)
        if len(ecv.exist_svs) < len(ecv.chart_vars.svs):
          self.state.uttr.counters.err(
              'failed_partial_existence_check_extended_svs', {
                  'places':
                      self.places,
                  'type':
                      self.state.place_type,
                  'svs':
                      list(
                          set(ecv.chart_vars.svs) -
                          set(self.existing_svs.keys()))
                      [:constants.DBG_LIST_LIMIT],
              })

  # Get chart-vars for addition to charts
  def get_chart_vars(self,
                     cv_existence: ChartVarsExistenceCheckState) -> ChartVars:
    cv = cv_existence.chart_vars
    # Set existing SVs.
    cv.svs = cv_existence.exist_svs
    # Set `has_single_point` if all SVs in the ChartVars have a single-data point.
    # Do so only for SIMPLE charts.
    if self.state.uttr.query_type == QueryType.SIMPLE:
      cv.has_single_point = all(self.existing_svs.get(v, False) for v in cv.svs)
    return cv


#
# This class helps batch existence checks.
#
class MainExistenceCheckTracker(ExistenceCheckTracker):

  def __init__(self, state: PopulateState, places: List[str], svs: List[str],
               sv2chartvarslist: Dict):
    super().__init__(state, places)

    # Loop over all SVs, and construct existence check state.
    for sv in svs:
      exist_state = SVExistenceCheckState(sv=sv, chart_vars_list=[])

      for chart_vars in sv2chartvarslist.get(sv):
        exist_cv = ChartVarsExistenceCheckState(chart_vars=chart_vars,
                                                exist_svs=[])
        if chart_vars.event:
          exist_cv.exist_event = utils.event_existence_for_place(
              places[0], chart_vars.event, self.state.uttr.counters)
          if not exist_cv.exist_event:
            state.uttr.counters.err(
                'failed_event_existence_check', {
                    'places': places[:constants.DBG_LIST_LIMIT],
                    'event': chart_vars.event
                })
        else:
          if all(v in self.all_svs for v in chart_vars.svs):
            # Avoid adding SVs that have already been added before.
            continue
        self.all_svs.update(chart_vars.svs)
        exist_state.chart_vars_list.append(exist_cv)

      # If we have the main chart-vars or extended-svs, add.
      if exist_state.chart_vars_list:
        self.exist_sv_states.append(exist_state)


#
# This class helps batch existence checks for SV extensions.
#
class ExtensionExistenceCheckTracker(ExistenceCheckTracker):

  # NOTE: If sv2extensions is set, then this is for extensions only.
  def __init__(self, state: PopulateState, places: List[str], svs: List[str],
               sv2extensions: Dict):
    super().__init__(state, places)

    # Loop over all SVs, and construct existence check state.
    for sv in svs:
      exist_state = SVExistenceCheckState(sv=sv, chart_vars_list=[])

      # Infer comparison charts with extended SVs.
      extended_svs = sv2extensions.get(sv, [])
      if extended_svs and not all(v in self.all_svs for v in extended_svs):
        state.block_id += 1
        exist_state.chart_vars_list.append(
            ChartVarsExistenceCheckState(chart_vars=ChartVars(
                svs=extended_svs, block_id=state.block_id, orig_sv=sv),
                                         exist_svs=[]))
        self.all_svs.update(extended_svs)

      # If we have the main chart-vars or extended-svs, add.
      if exist_state.chart_vars_list:
        self.exist_sv_states.append(exist_state)


#
# Returns a list of ChartVars, where each ChartVars may be a single SV or
# group of SVs.
#
def build_chart_vars(state: PopulateState,
                     sv: str,
                     rank: int = 0) -> List[ChartVars]:
  if utils.is_sv(sv):
    state.block_id += 1
    return [ChartVars(svs=[sv], block_id=state.block_id)]
  if utils.is_topic(sv):
    start = time.time()
    topic_vars = topic.get_topic_vars(sv, rank)
    peer_groups = topic.get_topic_peers(topic_vars)

    # Classify into two lists.
    just_svs = []
    svpgs = []
    for v in topic_vars:
      if v in peer_groups and peer_groups[v]:
        title = topic.svpg_name(v)
        description = topic.svpg_description(v)
        svpgs.append((title, description, peer_groups[v]))
      else:
        just_svs.append(v)
    state.uttr.counters.timeit('topic_calls', start)

    # Group into blocks carefully:

    # 1. Make a block for all SVs in just_svs
    state.block_id += 1
    charts = []
    for v in just_svs:
      # Skip PC for this case (per prior implementation)
      svs = []
      event = None
      if v.startswith(_EVENT_PREFIX):
        config_key = v[len(_EVENT_PREFIX):]
        etype = constants.EVENT_CONFIG_KEY_TO_EVENT_TYPE.get(config_key, None)
        if not etype:
          continue
        event = etype
      else:
        svs = [v]
      charts.append(
          ChartVars(svs=svs,
                    event=event,
                    block_id=state.block_id,
                    include_percapita=False,
                    source_topic=sv))

    # 2. Make a block for every peer-group in svpgs
    for (title, description, svs) in svpgs:
      state.block_id += 1
      charts.append(
          ChartVars(svs=svs,
                    block_id=state.block_id,
                    include_percapita=False,
                    title=title,
                    description=description,
                    is_topic_peer_group=True,
                    source_topic=sv))

    state.uttr.counters.info('topics_processed',
                             {sv: {
                                 'svs': just_svs,
                                 'peer_groups': svpgs,
                             }})
    return charts

  return []


#
# Update SVs from `sve_states` into `uttr.extra_success_svs` if
# it was originally returned from the embeddings.
#
def update_extra_success_svs(uttr: Utterance,
                             sve_states: List[SVExistenceCheckState]):
  if not sve_states:
    return
  if not uttr.svs:
    return

  orig_svs = set(uttr.svs)
  result = set()

  for sve in sve_states:
    if sve.sv in orig_svs:
      result.add(sve.sv)

  # Return in original order.
  for v in uttr.svs:
    if v in result:
      uttr.extra_success_svs.append(v)
  if uttr.extra_success_svs:
    uttr.counters.info('info_extra_success_svs', uttr.extra_success_svs)
