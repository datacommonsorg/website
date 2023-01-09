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


def compute(main_place, main_place_name, main_place_type, nearby_places,
            contained_place_type, svs):
  chart_spec = ChartSpec(main=MainPlaceSpec(place=main_place,
                                            name=main_place_name,
                                            type=main_place_type,
                                            svs=[]),
                         nearby=NearbyPlaceSpec(sv2places={}),
                         contained=ContainedPlaceSpec(
                             containing_place=main_place,
                             contained_place_type=contained_place_type,
                             svs=[]))
  sample_child_place = None
  all_places = nearby_places + [main_place]
  triples = dc.triples(main_place, 'in').get('triples')
  for prop, nodes in triples.items():
    if prop != 'containedInPlace' and prop != 'geoOverlaps':
      continue
    for node in nodes['nodes']:
      if contained_place_type in node['types']:
        all_places.append(node['dcid'])
        sample_child_place = node['dcid']
        break

  sv_existence = dc.observation_existence(svs, all_places)
  for sv in svs:
    for place, exist in sv_existence['variable'][sv]['entity'].items():
      if not exist:
        continue
      if place == main_place:
        chart_spec.main.svs.append(sv)
      elif place == sample_child_place:
        chart_spec.contained.svs.append(sv)
      else:
        if sv not in chart_spec.nearby.sv2places:
          chart_spec.nearby.sv2places[sv] = []
        chart_spec.nearby.sv2places[sv].append(place)
  return chart_spec
