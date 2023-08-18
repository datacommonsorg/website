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
from typing import Dict, List

from server.lib.nl.common import constants
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState


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
  def __init__(self, state: PopulateState, place2keys: Dict):
    self.state = state
    self.place2keys = place2keys
    self.places = sorted(place2keys.keys())
    self.all_svs = set()
    self.exist_sv_states: List[SVExistenceCheckState] = []
    # Map of existing SVs with key as SV DCID and value as
    # whether the SV has single-data point.
    self.existing_svs = {}

  def _run(self):
    # Perform batch existence check.
    if self.state.uttr.query_type == QueryType.SIMPLE:
      self.existing_svs, existsv2places = \
        utils.sv_existence_for_places_check_single_point(
          self.places, list(self.all_svs), self.state.uttr.counters)
    else:
      tmp_svs, tmp_existsv2places = utils.sv_existence_for_places(
          self.places, list(self.all_svs), self.state.uttr.counters)
      self.existing_svs = {v: False for v in tmp_svs}
      existsv2places = {}
      for sv, plset in tmp_existsv2places.items():
        existsv2places[sv] = {p: False for p in plset}

    # In `state`, set sv -> place Key -> is-single-point
    for sv, pl2sp in existsv2places.items():
      if sv not in self.state.exist_checks:
        self.state.exist_checks[sv] = {}
      for pl, is_singlepoint in pl2sp.items():
        k = self.place2keys[pl]
        if k not in self.state.exist_checks[sv]:
          self.state.exist_checks[sv][k] = False
        self.state.exist_checks[sv][k] |= is_singlepoint

    if not self.existing_svs:
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

  def __init__(self, state: PopulateState, place2keys: Dict[str, str],
               sv2chartvarslist: Dict):
    super().__init__(state, place2keys)
    places = place2keys.keys()

    # Loop over all SVs, and construct existence check state.
    for sv, chart_vars_list in sv2chartvarslist.items():
      exist_state = SVExistenceCheckState(sv=sv, chart_vars_list=[])
      for chart_vars in chart_vars_list:
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
  def __init__(self, state: PopulateState, place2keys: Dict[str, str],
               svs: List[str], sv2extensions: Dict):
    super().__init__(state, place2keys)

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


# Returns a list of place as a map with place DCID as key, and the value for
# grouping.
def get_places_to_check(state: PopulateState, places: List[Place],
                        is_explore: bool) -> Dict[str, str]:
  uttr = state.uttr
  # Get places to perform existence check on.
  places_to_check = {}
  for p in _get_place_dcids(places):
    places_to_check[p] = p
  if state.place_type:
    # Add child places
    key = places[0].dcid + state.place_type.value
    if is_explore:
      for p in uttr.detection.places_detected.child_places[:utils.
                                                           NUM_CHILD_PLACES_FOR_EXISTENCE]:
        places_to_check[p.dcid] = key
    else:
      ret_places = utils.get_sample_child_places(places[0].dcid,
                                                 state.place_type.value,
                                                 state.uttr.counters)
      for p in ret_places:
        places_to_check[p] = key
  if is_explore:
    for p in uttr.detection.places_detected.parent_places:
      places_to_check[p.dcid] = p.dcid
  return places_to_check


def _get_place_dcids(places: List[Place]) -> List[str]:
  dcids = []
  for p in places:
    dcids.append(p.dcid)
  return dcids
