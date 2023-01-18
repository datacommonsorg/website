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

from dataclasses import dataclass
from typing import Dict, List
import logging
import pandas as pd

from lib.nl.nl_detection import ClassificationType, Detection
from lib.nl import nl_variable, nl_topic
import services.datacommons as dc


@dataclass
class MainPlaceSpec:
  place: str
  name: str
  type: str
  svs: List[str]


@dataclass
class ContainedPlaceSpec:
  containing_place: str
  contained_place_type: str
  svs: List[str]


@dataclass
class DataSpec:
  main_place_spec: MainPlaceSpec
  contained_place_spec: ContainedPlaceSpec
  selected_svs: List[str]
  topic_svs: List[str]  # Will still contain svpg's
  extended_sv_map: Dict[str, List[str]]


def _highlight_svs(sv_df):
  if sv_df.empty:
    return []
  return sv_df[sv_df['CosineScore'] > 0.4]['SV'].values.tolist()


def _sample_child_place(main_place_dcid, contained_place_type):
  """Find a sampled child place"""
  if not contained_place_type:
    return None
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
  return None


def compute(query_detection: Detection, context_history):
  # ========    Get Place Info
  # Extract info from query_detection.
  places_detected = query_detection.places_detected
  main_place_dcid = places_detected.main_place.dcid
  main_place_name = places_detected.main_place.name
  main_place_type = places_detected.main_place.place_type

  # ========    Get SV info
  svs_detected = query_detection.svs_detected
  svs_df = pd.DataFrame({
      'SV': svs_detected.sv_dcids,
      'CosineScore': svs_detected.sv_scores
  })

  # ========    Check contained place type
  contained_place_type = ""
  for classifier in query_detection.classifications:
    if classifier.type == ClassificationType.CONTAINED_IN:
      contained_place_type = classifier.attributes.contained_in_place_type.value

  for classifier in query_detection.classifications:
    if classifier.type == ClassificationType.CORRELATION:
      if not contained_place_type:
        # CORRELATION requires contained_place_type to be present.
        for context in reversed(context_history):
          if 'data_spec' not in context['debug']:
            continue
          ds = context['debug']['data_spec']
          t = ds['contained_place_spec']['contained_place_type']
          if t:
            contained_place_type = t
            break

  # Filter SVs based on scores.
  highlight_svs = _highlight_svs(svs_df)
  selected_svs = []
  extended_sv_map = {}

  # Get selected stat vars and extended stat var map
  topic_svs = nl_topic.get_topics(highlight_svs)
  if topic_svs:
    selected_svs = topic_svs.copy()
    extended_sv_map = nl_topic.get_topic_peers(topic_svs)
  else:
    for sv in highlight_svs:
      if sv.startswith("dc/g") or sv.startswith("dc/topic"):
        continue
      selected_svs.append(sv)
    extended_sv_map = nl_variable.extend_svs(selected_svs)

  all_svs = selected_svs
  for sv, svs in extended_sv_map.items():
    all_svs.extend(svs)

  data_spec = DataSpec(main_place_spec=MainPlaceSpec(place=main_place_dcid,
                                                     name=main_place_name,
                                                     type=main_place_type,
                                                     svs=[]),
                       contained_place_spec=ContainedPlaceSpec(
                           containing_place=main_place_dcid,
                           contained_place_type=contained_place_type,
                           svs=[]),
                       selected_svs=selected_svs,
                       topic_svs=topic_svs,
                       extended_sv_map=extended_sv_map)

  if not all_svs:
    logging.info("No SVs to use for existence.")
    return data_spec

  all_places = [main_place_dcid]
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

  return data_spec
