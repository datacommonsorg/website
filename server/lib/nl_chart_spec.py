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
"""Module for NL page chart spec"""

from dataclasses import dataclass
from typing import Dict, List
import pandas as pd

from lib.nl_detection import ClassificationType, Detection
from lib import nl_variable
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
class ChartSpec:
  main: MainPlaceSpec
  nearby: NearbyPlaceSpec
  contained: ContainedPlaceSpec


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
  return sv_df[sv_df['CosineScore'] > 0.4]['SV'].values.tolist()


def compute(query_detection: Detection):
  if query_detection.classifications[0].type == ClassificationType.SIMPLE:

    # Extract info from query_detection.
    places_detected = query_detection.places_detected
    main_place_dcid = places_detected.main_place.dcid
    main_place_name = places_detected.main_place.name
    main_place_type = places_detected.main_place.place_type

    svs_detected = query_detection.svs_detected
    svs_df = pd.DataFrame({
        'SV': svs_detected.sv_dcids,
        'CosineScore': svs_detected.sv_scores
    })

    # Use SVs and Places to get relevant data/stats/chart configs.
    related_places = _related_places(main_place_dcid)
    contained_place_type = ""
    if 'childPlacesType' in related_places:
      contained_place_type = related_places['childPlacesType']
    # all_relevant_places = list(
    #     set(related_places['parentPlaces'] + related_places['nearbyPlaces'] +
    #         related_places['similarPlaces']))

    # Filter SVs based on scores.
    highlight_svs = _highlight_svs(svs_df)
    # relevant_svs_df = _filtered_svs_df(svs_df)
    # relevant_svs = relevant_svs_df['SV'].values.tolist()

    # Get related SVGs and all info.
    # svgs_info = _related_svgs(relevant_svs, all_relevant_places)

    # Get useful sv2name and sv2definitions.
    # sv_maps = _sv_definition_name_maps(svgs_info, relevant_svs)
    # sv2name = sv_maps["sv2name"]
    # sv2definition = sv_maps["sv2definition"]

    # Get SVGs into peer buckets.
    # peer_buckets = _peer_buckets(sv2definition, relevant_svs)

    # Produce Chart Config JSON.
    # chart_config = _chart_config(place_dcid, main_place_type, main_place_name,
    #                              child_places_type, highlight_svs, sv2name,
    #                              peer_buckets)

    # message = ParseDict(chart_config, subject_page_pb2.SubjectPageConfig())

    # This is a new try to extend svs to siblingins. This is to extend the
    # stat vars "a little bit"
    # Get expanded stat var list
    extended_svs = nl_variable.extend(highlight_svs)

    all_svs = highlight_svs + extended_svs

    chart_spec = ChartSpec(main=MainPlaceSpec(place=main_place_dcid,
                                              name=main_place_name,
                                              type=main_place_type,
                                              svs=[]),
                           nearby=NearbyPlaceSpec(sv2places={}),
                           contained=ContainedPlaceSpec(
                               containing_place=main_place_dcid,
                               contained_place_type=contained_place_type,
                               svs=[]))
    sample_child_place = None
    all_places = related_places['nearbyPlaces'] + [main_place_dcid]
    triples = dc.triples(main_place_dcid, 'in').get('triples')
    if triples:
      for prop, nodes in triples.items():
        if prop != 'containedInPlace' and prop != 'geoOverlaps':
          continue
        for node in nodes['nodes']:
          if contained_place_type in node['types']:
            all_places.append(node['dcid'])
            sample_child_place = node['dcid']
            break

    sv_existence = dc.observation_existence(all_svs, all_places)
    for sv in all_svs:
      for place, exist in sv_existence['variable'][sv]['entity'].items():
        if not exist:
          continue
        if place == main_place_dcid:
          chart_spec.main.svs.append(sv)
        elif place == sample_child_place:
          chart_spec.contained.svs.append(sv)
        else:
          if sv not in chart_spec.nearby.sv2places:
            chart_spec.nearby.sv2places[sv] = []
          chart_spec.nearby.sv2places[sv].append(place)

    return chart_spec, highlight_svs, extended_svs
