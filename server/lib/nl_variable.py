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
"""Module for NL page variable"""

from abc import ABC
from dataclasses import dataclass
from enum import Enum
from typing import List

import services.datacommons as dc


class Entry(ABC):
  """Abctract class to hold an entry in VariableStore."""
  pass


@dataclass
class SimpleEntry(Entry):
  dcid: str


@dataclass
class PeerEntry(Entry):
  # sources contains the sv/svg from the model. They are used to deduce peer
  sources: List[str]
  # peers are computed from the stat vars in sources.
  peers: List[str]


class VariableStore:
  entries: List[Entry]


def expand_svg(svgs: List[str]):
  """Expand svg"""
  result = {}
  svg2svs = dc.property_values(svgs, "memberOf", False)
  # svgs_l2 is to search one more level
  svgs_l2 = []
  for svg, svs in svg2svs.items():
    if not svs:
      svgs_l2.append(svg)
      result[svg] = []
    else:
      result[svg] = svs
  if svgs_l2:
    child_svgs = []
    svg2childsvgs = dc.property_values(svgs_l2, "specializationOf", False)
    all_child_svgs = []
    for svg, child_svgs in svg2childsvgs.items():
      all_child_svgs.extend(child_svgs)
    childsvg2svs = dc.property_values(all_child_svgs, "memberOf", False)
    for svg, child_svgs in svg2childsvgs.items():
      for child_svg in child_svgs:
        result[svg].extend(childsvg2svs[child_svg])
  return result


def extend_svs(svs: List[str]):
  """Extend all svs with siblings svs under the same svg.
  """
  sv2svgs = dc.property_values(svs, "memberOf", True)
  sv2svg = {sv: svg[0] for sv, svg in sv2svgs.items() if svg}
  svg2children = dc.property_values(sv2svg.values(), "memberOf", False)
  result = {}
  for sv, svg in sv2svg.items():
    result[sv] = svg2children.get(svg, [])
  return result
