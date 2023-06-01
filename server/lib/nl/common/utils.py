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
"""Utility functions for use by the NL modules."""

import datetime
import logging
import random
import time
from typing import Dict, List

import server.lib.fetch as fetch
import server.lib.nl.common.constants as constants
import server.lib.nl.common.counters as ctr
import server.lib.nl.common.utterance as nl_uttr
import server.lib.nl.detection.types as types
import server.lib.nl.fulfillment.context as ctx
import shared.lib.constants as shared_constants

# TODO: Consider tweaking/reducing this
_NUM_CHILD_PLACES_FOR_EXISTENCE = 15


def is_topic(sv):
  return sv.startswith("dc/topic/")


def is_svg(sv):
  return sv.startswith("dc/g/")


def is_svpg(sv):
  return sv.startswith("dc/svpg/")


def is_sv(sv):
  return not (is_topic(sv) or is_svg(sv))


# Checks if there is an event in the last 1 year.
def event_existence_for_place(place: str, event: types.EventType,
                              counters: ctr.Counters) -> bool:
  for event_type in constants.EVENT_TYPE_TO_DC_TYPES[event]:
    start = time.time()
    date_list = fetch.event_collection_date(event_type,
                                            place).get('eventCollectionDate',
                                                       {}).get('dates', [])
    counters.timeit('event_existence_for_place', start)
    cur_year = datetime.datetime.now().year
    prev_year = str(cur_year - 1)
    cur_year = str(cur_year)
    # A crude recency check
    for date in date_list:
      if date.startswith(cur_year) or date.startswith(prev_year):
        return True
  return False


#
# Returns a list of existing SVs (as a union across places).
# The order of the returned SVs matches the input order.
#
def sv_existence_for_places(places: List[str], svs: List[str],
                            counters: ctr.Counters) -> List[str]:
  if not svs:
    return []

  start = time.time()
  sv_existence = fetch.observation_existence(svs, places)
  counters.timeit('sv_existence_for_places', start)
  if not sv_existence:
    logging.error("Existence checks for SVs failed.")
    return []

  existing_svs = []
  for sv in svs:
    exists = False
    for _, exist_bit in sv_existence.get(sv, {}).items():
      if not exist_bit:
        continue
      exists = True
      break
    if exists:
      existing_svs.append(sv)

  return existing_svs


# Returns a map of existing SVs (as a union across places)
# keyed by SV DCID with value set to True if the SV has any
# single data point series (across all places).
def sv_existence_for_places_check_single_point(
    places: List[str], svs: List[str],
    counters: ctr.Counters) -> Dict[str, bool]:
  if not svs:
    return {}

  start = time.time()
  series_data = fetch.series_core(entities=places,
                                  variables=svs,
                                  all_facets=False)
  counters.timeit('sv_existence_for_places_check_single_point', start)

  existing_svs = {}
  for sv, sv_data in series_data.get('data', {}).items():
    for _, place_data in sv_data.items():
      if not place_data.get('series'):
        continue
      num_series = len(place_data['series'])
      existing_svs[sv] = existing_svs.get(sv, False) | (num_series == 1)
  return existing_svs


#
# Given a place DCID and a child place type, returns a sample list
# of places of that child type.
#
def _get_sample_child_places(main_place_dcid: str,
                             contained_place_type: str) -> List[str]:
  """Find a sampled child place"""
  logging.info('_sample_child_place: for %s - %s', main_place_dcid,
               contained_place_type)
  if not contained_place_type:
    return []
  child_places = fetch.descendent_places([main_place_dcid],
                                         contained_place_type)
  if child_places.get(main_place_dcid):
    logging.info(
        '_sample_child_place returning %s', ', '.join(
            child_places[main_place_dcid][:_NUM_CHILD_PLACES_FOR_EXISTENCE]))
    return child_places[main_place_dcid][:_NUM_CHILD_PLACES_FOR_EXISTENCE]
  else:
    arcs = fetch.triples([main_place_dcid], False).get(main_place_dcid)
    if arcs:
      for prop, nodes in arcs.items():
        if prop != 'containedInPlace' and prop != 'geoOverlaps':
          continue
        child_places = []
        for node in nodes:
          if contained_place_type in node['types']:
            child_places.append(node['dcid'])
        if child_places:
          logging.info(
              '_sample_child_place returning %s',
              ', '.join(child_places[:_NUM_CHILD_PLACES_FOR_EXISTENCE]))
          return child_places[:_NUM_CHILD_PLACES_FOR_EXISTENCE]
  logging.info('_sample_child_place returning empty')
  return []


def get_sample_child_places(main_place_dcid: str, contained_place_type: str,
                            counters: ctr.Counters) -> List[str]:
  start = time.time()
  result = _get_sample_child_places(main_place_dcid, contained_place_type)
  counters.timeit('get_sample_child_places', start)
  counters.info(
      'child_places_result', {
          'place': main_place_dcid,
          'type': contained_place_type,
          'result': result[:constants.DBG_LIST_LIMIT]
      })
  return result


def get_all_child_places(main_place_dcid: str, contained_place_type: str,
                         counters: ctr.Counters) -> List[types.Place]:
  start = time.time()
  resp = fetch.raw_descendent_places([main_place_dcid], contained_place_type)
  counters.timeit('get_all_child_places', start)

  results = []
  for _, nodes in resp.items():
    for node in nodes:
      if not node.get('dcid') or not node.get('name'):
        continue
      results.append(
          types.Place(dcid=node['dcid'],
                      name=node['name'],
                      place_type=contained_place_type))
  return results


def get_immediate_parent_places(main_place_dcid: str, parent_place_type: str,
                                counters: ctr.Counters) -> List[types.Place]:
  start = time.time()
  resp = fetch.raw_property_values([main_place_dcid], 'containedInPlace')
  counters.timeit('get_immediate_parent_places', start)
  results = []
  nodes = resp.get(main_place_dcid, [])
  for node in nodes:
    if not node.get('dcid') or not node.get('name') or not node.get('types'):
      continue
    if parent_place_type not in node['types']:
      continue
    results.append(
        types.Place(dcid=node['dcid'],
                    name=node['name'],
                    place_type=parent_place_type))
  # Sort results for determinism.
  results.sort(key=lambda p: p.dcid)
  return results


# Returns a list of parent place names for a dcid.
def parent_place_names(dcid: str) -> List[str]:
  parent_dcids = fetch.property_values(nodes=[dcid],
                                       prop='containedInPlace')[dcid]
  if parent_dcids:
    names = fetch.property_values(nodes=parent_dcids, prop='name')
    ret = [names[p][0] for p in parent_dcids]
    return ret
  return None


def get_contained_in_type(
    uttr: nl_uttr.Utterance) -> types.ContainedInPlaceType:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.CONTAINED_IN)
  place_type = None
  if (classification and isinstance(classification[0].attributes,
                                    types.ContainedInClassificationAttributes)):
    # Ranking among places.
    place_type = classification[0].attributes.contained_in_place_type
  return place_type


def get_size_types(uttr: nl_uttr.Utterance) -> List[types.SizeType]:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.SIZE_TYPE)
  size_types = []
  if (classification and isinstance(classification[0].attributes,
                                    types.SizeTypeClassificationAttributes)):
    # Ranking among places.
    size_types = classification[0].attributes.size_types
  return size_types


def get_ranking_types(uttr: nl_uttr.Utterance) -> List[types.RankingType]:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.RANKING)
  ranking_types = []
  if (classification and isinstance(classification[0].attributes,
                                    types.RankingClassificationAttributes)):
    # Ranking among places.
    ranking_types = classification[0].attributes.ranking_type
  return ranking_types


def get_quantity(
    uttr: nl_uttr.Utterance) -> types.QuantityClassificationAttributes:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.QUANTITY)
  if (classification and isinstance(classification[0].attributes,
                                    types.QuantityClassificationAttributes)):
    return classification[0].attributes
  return None


def get_time_delta_types(uttr: nl_uttr.Utterance) -> List[types.TimeDeltaType]:
  classification = ctx.classifications_of_type_from_utterance(
      uttr, types.ClassificationType.TIME_DELTA)
  time_delta = []
  # Get time delta type
  if (classification and isinstance(classification[0].attributes,
                                    types.TimeDeltaClassificationAttributes)):
    time_delta = classification[0].attributes.time_delta_types
  return time_delta


def pluralize_place_type(place_type: str) -> str:
  result = shared_constants.PLACE_TYPE_TO_PLURALS.get(
      place_type.lower(), shared_constants.PLACE_TYPE_TO_PLURALS["place"])
  return result.title()


def has_map(place_type: any, places: List[types.Place]) -> bool:
  if isinstance(place_type, str):
    place_type = types.ContainedInPlaceType(place_type)
  if place_type == types.ContainedInPlaceType.COUNTRY:
    return True
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place_type, None)
  if not ptype or not places:
    # Either not an equivalent type or places is empty, no map!
    return False
  return places[0].country in constants.ADMIN_AREA_MAP_COUNTRIES


def new_session_id() -> str:
  # Convert seconds to microseconds
  micros = int(datetime.datetime.now().timestamp() * 1000000)
  # Add some randomness to avoid clashes
  rand = random.randrange(1000)
  # Prefix randomness since session_id gets used as BT key
  return str(rand) + '_' + str(micros)


def get_time_delta_title(direction: types.TimeDeltaType,
                         is_absolute: bool) -> str:
  return ' '.join([
      'Increase' if direction == types.TimeDeltaType.INCREASE else 'Decrease',
      'over time',
      '(by absolute change)' if is_absolute else '(by percent change)'
  ])


def get_default_child_place_type(
    place: types.Place) -> types.ContainedInPlaceType:
  if place.dcid == constants.EARTH_DCID:
    return types.ContainedInPlaceType.COUNTRY
  # Canonicalize the type.
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place.place_type,
                                                   place.place_type)
  ptype = constants.CHILD_PLACE_TYPES.get(ptype, None)
  if ptype:
    ptype = admin_area_equiv_for_place(ptype, place)
  # TODO: Since most queries/data tends to be US specific and we have
  # maps for it, we pick County as default, but reconsider in future.
  if not ptype:
    ptype = types.ContainedInPlaceType.COUNTY
  return ptype


def get_parent_place_type(place_type: types.ContainedInPlaceType,
                          place: types.Place) -> types.ContainedInPlaceType:
  # Canonicalize the type.
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place_type, place_type)
  ptype = constants.PARENT_PLACE_TYPES.get(ptype, None)
  if ptype:
    ptype = admin_area_equiv_for_place(ptype, place)
  return ptype


# Given a place-type and a corresponding (contained-in) place,
# returns the specific AdminArea type (County, EurostatNUTS2, etc)
# corresponding to the country that the place is located in.
def admin_area_equiv_for_place(
    place_type: types.ContainedInPlaceType,
    place: types.Place) -> types.ClassificationAttributes:
  # Convert to AA equivalent
  ptype = constants.ADMIN_DIVISION_EQUIVALENTS.get(place_type, None)
  # Not an admin-equivalent type
  if not ptype:
    return place_type

  custom_remap = {}
  if place.country == 'country/USA':
    custom_remap = constants.USA_PLACE_TYPE_REMAP
  elif place.country == 'country/PAK':
    custom_remap = constants.PAK_PLACE_TYPE_REMAP
  elif place.country in constants.EU_COUNTRIES:
    custom_remap = constants.EU_PLACE_TYPE_REMAP

  return custom_remap.get(ptype, ptype)


# Returns true if the score of multi-sv detection exceeds the single
# SV detection.
def is_multi_sv(uttr: nl_uttr.Utterance) -> bool:
  if (not uttr.detection.svs_detected.sv_scores or not uttr.multi_svs or
      not uttr.multi_svs.candidates):
    return False
  # Get the top single-sv and multi-sv scores.
  top_sv_score = uttr.detection.svs_detected.sv_scores[0]
  top_multi_sv_score = uttr.multi_svs.candidates[0].aggregate_score

  # Prefer multi-sv when the scores are higher or up to a score differential.
  if (top_multi_sv_score > top_sv_score or top_sv_score - top_multi_sv_score
      <= shared_constants.MULTI_SV_SCORE_DIFFERENTIAL):
    return True
  return False


def has_dual_sv(uttr: nl_uttr.Utterance) -> bool:
  if not is_multi_sv(uttr):
    return False
  for c in uttr.multi_svs.candidates:
    if len(c.parts) == 2:
      return True
  return False
