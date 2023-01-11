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

import copy
from dataclasses import dataclass
from typing import Dict, List
import logging
import pandas as pd

from lib.nl_detection import ClassificationType, Detection, Place
from lib import nl_variable, nl_topic
import services.datacommons as dc


@dataclass
class MainPlaceSpec:
  place: str
  name: str
  type: str
  svs: List[str]


@dataclass
class NearbyPlaceSpec:
  sv2places: Dict[str, List[str]]


@dataclass
class ContainedPlaceSpec:
  containing_place: str
  contained_place_type: str
  svs: List[str]


@dataclass
class DataSpec:
  main_place_spec: MainPlaceSpec
  nearby_place_spec: NearbyPlaceSpec
  contained_place_spec: ContainedPlaceSpec
  selected_svs: List[str]
  topic_svs: List[str]  # Will still contain svpg's
  expanded_svs: List[str]
  extended_sv_map: Dict[str, List[str]]
  primary_sv: str
  primary_sv_siblings: List[str]
  use_context_sv: bool
  context_place: Place
  context_sv: str


def _get_related_places(place_dcid):
  place_page_data = dc.get_landing_page_data(place_dcid, 'Overview', [])
  if not place_page_data:
    place_page_data = {}

  if "parentPlaces" not in place_page_data:
    place_page_data["parentPlaces"] = []
  if "childPlacesType" not in place_page_data:
    place_page_data["childPlacesType"] = ""
  if "nearbyPlaces" not in place_page_data:
    place_page_data["nearbyPlaces"] = []
  if "similarPlaces" not in place_page_data:
    place_page_data["similarPlaces"] = []

  return place_page_data


def _related_places(dcid):
  # Get related places using Place API
  related_places = _get_related_places(dcid)
  # related_places['nearbyPlaces'] += [dcid]
  # related_places['similarPlaces'] += [dcid]
  return related_places


def _highlight_svs(sv_df):
  if sv_df.empty:
    return []
  return sv_df[sv_df['CosineScore'] > 0.5]['SV'].values.tolist()


def _sample_child_place(main_place_dcid, contained_place_type):
  # Find a sampled child place
  if contained_place_type == "City":
    return "geoId/0667000"
  child_places = dc.get_places_in([main_place_dcid], contained_place_type)
  if child_places.get(main_place_dcid):
    return child_places[main_place_dcid][0]
  else:
    triples = dc.triples(main_place_dcid, 'in').get('triples')
    if triples:
      for prop, nodes in triples.items():
        if prop != 'containedInPlace' and prop != 'geoOverlaps':
          continue
        for node in nodes['nodes']:
          if contained_place_type in node['types']:
            return node['dcid']


def compute(query_detection: Detection, context):
  # ========    Get Place Info
  # Extract info from query_detection.
  places_detected = query_detection.places_detected
  main_place_dcid = places_detected.main_place.dcid
  main_place_name = places_detected.main_place.name
  main_place_type = places_detected.main_place.place_type

  context_sv = None
  context_place = None
  if context and context['debug'] and context['debug']['data_spec']:
    context_sv = context['debug']['data_spec'].get('primary_sv', None)
    context_place = Place(dcid=context['place_dcid'],
                          name=context['place_name'],
                          place_type=context['place_type'])

  # ========    Get SV info
  svs_detected = query_detection.svs_detected
  svs_df = pd.DataFrame({
      'SV': svs_detected.sv_dcids,
      'CosineScore': svs_detected.sv_scores
  })
  # Use SVs and Places to get relevant data/stats/chart configs.
  related_places = _related_places(main_place_dcid)

  contained_place_type = ""
  for classifier in query_detection.classifications:
    if classifier.type == ClassificationType.CONTAINED_IN:
      contained_place_type = classifier.attributes.contained_in_place_type.value
  if not contained_place_type:
    if 'childPlacesType' in related_places:
      contained_place_type = related_places['childPlacesType']
  # all_relevant_places = list(
  #     set(related_places['parentPlaces'] + related_places['nearbyPlaces'] +
  #         related_places['similarPlaces']))

  # Filter SVs based on scores.
  highlight_svs = _highlight_svs(svs_df)
  topic_svs = nl_topic.get_topics(highlight_svs)
  expanded_svgs = nl_variable.expand_svg(
      [x for x in highlight_svs if x.startswith("dc/g")])
  selected_svs = []
  expanded_svs = []
  for sv in highlight_svs:
    if sv.startswith("dc/g"):
      if expanded_svgs[sv]:
        expanded_svs.extend(expanded_svgs[sv])
    else:
      selected_svs.append(sv)

  use_context_sv = False
  if not selected_svs and context_sv:
    selected_svs = [context_sv]
    use_context_sv = True
  extended_sv_map = nl_variable.extend_svs(selected_svs)

  # Get extended stat var list
  if topic_svs:
    selected_svs = topic_svs.copy()
    extended_sv_map = nl_topic.get_topic_peers(topic_svs)

  all_svs = selected_svs + expanded_svs
  for sv, svs in extended_sv_map.items():
    all_svs.extend(svs)

  data_spec = DataSpec(main_place_spec=MainPlaceSpec(place=main_place_dcid,
                                                     name=main_place_name,
                                                     type=main_place_type,
                                                     svs=[]),
                       nearby_place_spec=NearbyPlaceSpec(sv2places={}),
                       contained_place_spec=ContainedPlaceSpec(
                           containing_place=main_place_dcid,
                           contained_place_type=contained_place_type,
                           svs=[]),
                       selected_svs=selected_svs,
                       expanded_svs=expanded_svs,
                       topic_svs=topic_svs,
                       extended_sv_map=extended_sv_map,
                       primary_sv="",
                       primary_sv_siblings=[],
                       use_context_sv=use_context_sv,
                       context_sv=context_sv,
                       context_place=context_place)

  if not all_svs:
    logging.info("No SVs to use for existence.")
    return data_spec

  all_places = related_places['nearbyPlaces'] + [main_place_dcid]
  sample_child_place = _sample_child_place(main_place_dcid,
                                           contained_place_type)
  if sample_child_place:
    all_places.append(sample_child_place)

  sv_existence = dc.observation_existence(all_svs, all_places)
  if not sv_existence:
    logging.info("Existence checks for SVs failed.")
    return data_spec

  for sv in all_svs:
    for place, exist in sv_existence['variable'][sv]['entity'].items():
      if not exist:
        continue
      if place == main_place_dcid:
        data_spec.main_place_spec.svs.append(sv)
      elif place == sample_child_place:
        data_spec.contained_place_spec.svs.append(sv)
      else:
        if sv not in data_spec.nearby_place_spec.sv2places:
          data_spec.nearby_place_spec.sv2places[sv] = []
        data_spec.nearby_place_spec.sv2places[sv].append(place)

  # Get stat var from context
  if data_spec.use_context_sv:
    data_spec.primary_sv = context_sv
  elif data_spec.main_place_spec.svs:
    # Find the first sv, it may not have data for main place
    # But this logic might change.
    data_spec.primary_sv = data_spec.main_place_spec.svs[0]

  data_spec.primary_sv_siblings = data_spec.extended_sv_map[
      data_spec.primary_sv]

  return data_spec
