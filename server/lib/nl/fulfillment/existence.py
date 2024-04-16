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

from collections import OrderedDict
from dataclasses import dataclass
from typing import Dict, List

from server.lib.nl.common import constants
from server.lib.nl.common import utils
from server.lib.nl.detection.date import get_date_range_strings
from server.lib.nl.detection.types import Place
import server.lib.nl.fulfillment.existence as ext
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import ExistInfo
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
  # Map of existing svs map of place to facet metadata that exists for that SV and place.
  exist_sv_facets: Dict[str, Dict[str, Dict[str, str]]]
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
    # Map of existing SVs with key as SV DCID and value as an ID to a facet that
    # has data for that SV.
    self.existing_svs = {}

  # Gets a map of sv to place key to the facet that exist most commonly for that
  # combination of sv and place key. Multiple places can map to the same
  # place key so this is the facet that exists for the most number of places
  # of each place key.
  def _get_sv_place_facet(self):
    sv_place_facet = {}
    for sv, pl2f in self.existing_svs.items():
      # place key -> facet id -> number of place keys that have this facet id
      place_facet_occurences = {}
      # place key -> most common facet for that key
      place_facets = {}
      for pl, facet in pl2f.items():
        place_facet_id = facet.get('facetId', '')
        if not place_facet_id:
          continue
        k = self.place2keys[pl]
        if not k in place_facet_occurences:
          place_facet_occurences[k] = {}
        place_facet_id_occurences = place_facet_occurences[k].get(
            place_facet_id, 0) + 1
        place_facet_occurences[k][place_facet_id] = place_facet_id_occurences
        # Check if current facet we are looking at occurs more often than the
        # facet that's saved for the place key. If so, replace the saved facet
        saved_facet_id = place_facets.get(k, {}).get('facetId', '')
        if place_facet_id_occurences > place_facet_occurences.get(k, {}).get(
            saved_facet_id, 0):
          place_facets[k] = facet
      sv_place_facet[sv] = place_facets
    return sv_place_facet

  def _get_sv_place_latest_dates(self, sv_place_facet):
    sv_place_latest_dates = {}
    _, end_date = get_date_range_strings(self.state.date_range)

    # If there is no end date in the date range, don't need to calculate latest
    # date because by default we show the latest date available
    if not end_date:
      return sv_place_latest_dates

    # If there are no svs, return
    sv_list = list(sv_place_facet.keys())
    if not sv_list:
      return sv_place_latest_dates

    # Using place_keys and child type, get the list of place dcids associated
    # with the child type
    place_keys = list(set(self.place2keys.values()))
    places_with_child_type = []
    if self.state.place_type and self.state.place_type.value:
      child_type = self.state.place_type.value
      for plk in place_keys:
        if not child_type in plk:
          continue
        parent_place = plk.split(child_type)[0]
        if parent_place:
          places_with_child_type.append(parent_place)

    # Update sv_place_latest_dates with latest dates retrieved for contained in places
    sv_place_latest_dates = utils.get_contained_in_latest_date(
        places_with_child_type, self.state.place_type, sv_list,
        self.state.date_range)

    # Get predicted latest dates for the svs and place keys in sv_place_facet
    predicted_latest_dates = utils.get_predicted_latest_date(
        sv_place_facet, self.state.date_range)

    # Go through the list of svs and place keys. If latest date is missing, try
    # to use a predicted latest date.
    for sv in sv_list:
      for plk in place_keys:
        if sv in sv_place_latest_dates and plk in sv_place_latest_dates[sv]:
          continue
        if sv in predicted_latest_dates and plk in predicted_latest_dates[sv]:
          sv_place_latest_dates[sv] = sv_place_latest_dates.get(sv, {})
          sv_place_latest_dates[sv][plk] = predicted_latest_dates[sv][plk]

    return sv_place_latest_dates

  def _run(self):
    # Perform batch existence check.
    # TODO: Optimize this!
    self.existing_svs, existsv2places = \
      utils.sv_existence_for_places_check_single_point(
        places=self.places, svs=list(self.all_svs), single_date=self.state.single_date, date_range=self.state.date_range, counters=self.state.uttr.counters)

    sv_place_facet = self._get_sv_place_facet()
    sv_place_latest_dates = {}
    if self.state.date_range:
      sv_place_latest_dates = self._get_sv_place_latest_dates(sv_place_facet)
    # In `state`, set sv -> place Key -> ExistInfo
    for sv, pl2sp in existsv2places.items():
      if sv not in self.state.exist_checks:
        self.state.exist_checks[sv] = {}
      for pl, is_singlepoint in pl2sp.items():
        k = self.place2keys[pl]
        k_facet = sv_place_facet.get(sv, {}).get(k, {})
        if k not in self.state.exist_checks[sv]:
          self.state.exist_checks[sv][k] = ExistInfo(
              is_single_point=False,
              facet=k_facet,
              latest_valid_date=sv_place_latest_dates.get(sv, {}).get(k, ''))
        self.state.exist_checks[sv][k].is_single_point |= is_singlepoint

    if not self.existing_svs:
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
            ecv.exist_sv_facets = self.existing_svs

  # Get chart-vars for addition to charts
  def get_chart_vars(self,
                     cv_existence: ChartVarsExistenceCheckState) -> ChartVars:
    cv = cv_existence.chart_vars
    # Set existing SVs.
    cv.svs = cv_existence.exist_svs
    return cv


#
# This class helps batch existence checks.
#
class MainExistenceCheckTracker(ExistenceCheckTracker):

  def __init__(self, state: PopulateState, place2keys: Dict[str, str],
               sv2chartvarslist: OrderedDict[str, List[ChartVars]]):
    super().__init__(state, place2keys)
    places = place2keys.keys()

    # Loop over all SVs, and construct existence check state.
    for sv, chart_vars_list in sv2chartvarslist.items():
      exist_state = SVExistenceCheckState(sv=sv, chart_vars_list=[])
      for chart_vars in chart_vars_list:
        exist_cv = ChartVarsExistenceCheckState(chart_vars=chart_vars,
                                                exist_svs=[],
                                                exist_sv_facets={})
        if chart_vars.event:
          exist_cv.exist_event = utils.event_existence_for_place(
              places[0], chart_vars.event, self.state.uttr.counters)
          if not exist_cv.exist_event:
            state.uttr.counters.err(
                'failed_event_existence_check', {
                    'places': places[:constants.DBG_LIST_LIMIT],
                    'event': chart_vars.event
                })
        elif len(chart_vars.orig_sv_map) < 2:
          # Do this dedupe only for non-correlation chart-vars.
          # Because scatter plots will have overlapping vars.
          # Imagine:  (sv1, sv2) vs. (sva, svb, svc, svd, sve)
          # And assume: sv1 doesn't exist.
          # By the time we get to (sv2, svd) as a pair, both
          # SVs will exist.

          # NOTE: This does not prevent an SV that first appears alone
          # and is then part of a topic.  For that case, we do
          # chart dedupe (since having that SV as part of the
          # peer group is useful).
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
        exist_state.chart_vars_list.append(
            ChartVarsExistenceCheckState(chart_vars=ChartVars(
                svs=extended_svs,
                orig_sv_map={sv: extended_svs},
                is_topic_peer_group=True),
                                         exist_svs=[],
                                         exist_sv_facets={}))
        self.all_svs.update(extended_svs)

      # If we have the main chart-vars or extended-svs, add.
      if exist_state.chart_vars_list:
        self.exist_sv_states.append(exist_state)


# Returns a list of place as a map with place DCID as key, and the value for
# grouping.
def get_places_to_check(state: PopulateState,
                        places: List[Place]) -> Dict[str, str]:
  uttr = state.uttr
  # Get places to perform existence check on.
  places_to_check = {}
  for p in _get_place_dcids(places):
    places_to_check[p] = p
  if state.place_type and len(places) == 1:
    # Add child places
    key = places[0].dcid + state.place_type.value
    if state.place_type.value == uttr.detection.places_detected.child_place_type:
      # Only if the requested place-type matches the stored place-type should we use.
      for p in uttr.detection.places_detected.child_places[:utils.
                                                           NUM_CHILD_PLACES_FOR_EXISTENCE]:
        places_to_check[p.dcid] = key
    else:
      try:
        ret_places = utils.get_all_child_places(places[0].dcid,
                                                state.place_type.value,
                                                state.uttr.counters)
        ret_places = ret_places[:utils.NUM_CHILD_PLACES_FOR_EXISTENCE]
      except Exception as e:
        state.uttr.counters.err('failed_get_all_child_places', str(e))
        return places_to_check
      for p in ret_places:
        places_to_check[p.dcid] = key
  # NOTE: We don't do existence check on parent places since it is
  # not really shown on the Explore UI anymore.
  return places_to_check


def _get_place_dcids(places: List[Place]) -> List[str]:
  dcids = []
  for p in places:
    dcids.append(p.dcid)
  return dcids


def chart_vars_fetch(tracker: ext.MainExistenceCheckTracker) -> List[ChartVars]:
  chart_vars_list: List[ChartVars] = []
  for exist_state in tracker.exist_sv_states:
    for exist_cv in exist_state.chart_vars_list:
      cv = tracker.get_chart_vars(exist_cv)
      if cv.svs:
        chart_vars_list.append(cv)
  return chart_vars_list
