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
from dataclasses import dataclass, field
from typing import Dict, List

import services.datacommons as dc


@dataclass
class SV:
  mp: str = ''
  st: str = ''
  pt: str = ''
  pvs: Dict[str, str] = field(default_factory=dict)


@dataclass
class SVG:
  pt: str = ''
  pvs: Dict[str, str] = field(default_factory=dict)
  p: str = ''


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


def parse_sv(sv_definition: str) -> SV:
  res = SV()
  parts = sv_definition.split(",")
  for part in parts:
    k, v = part.split("=")
    if k == "pt":
      res.pt = v
    elif k == "mp":
      res.mp = v
    elif k == "st":
      res.st = v
    else:
      res.pvs[k] = v
  return res


def parse_svg(svg_dcid: str) -> SVG:
  res = SVG()
  body = svg_dcid[len("dc/g/"):]
  parts = body.split("_")
  if len(parts) == 1:
    return res
  res.pt = parts[0]
  for part in parts[1:]:
    if "-" in part:
      p, v = part.split("-")
      p_lower = p.replace(p[0], p[0].lower(), 1)
      res.pvs[p_lower] = v
    else:
      res.p = part.replace(part[0], part[0].lower(), 1)
  return res


def extend_svs(svs: Dict[str, List[str]]):
  """Extend all svs with siblings svs.
  """
  if not svs:
    return {}
  sv2svgs = dc.property_values(svs, "memberOf", True)
  sv2svg = {sv: svg[0] for sv, svg in sv2svgs.items() if svg}
  svg2childsvs = {}
  svginfo = dc.get_variable_group_info(list(sv2svg.values()), [])
  for item in svginfo['data']:
    svg2childsvs[item['node']] = item['info']['childStatVars']

  res = {}
  for sv, svg in sv2svg.items():
    res[sv] = []
    svg_obj = parse_svg(svg)
    sv_obj = None
    for child_sv in svg2childsvs[svg]:
      if child_sv['id'] == sv:
        sv_obj = parse_sv(child_sv['definition'])
        break
    if not sv_obj:
      continue
    if len(svg_obj.pvs) == len(sv_obj.pvs):
      # There are no direct siblings of this sv in the current svg.
      # need to look for in-direct siblings
      svg_parent = dc.property_values([svg], "specializationOf", True)[svg][0]
      svg_siblings = dc.property_values([svg_parent], "specializationOf",
                                        False)[svg_parent]
      svg_siblings_info = dc.get_variable_group_info(svg_siblings, [])
      for item in svg_siblings_info['data']:
        for sv_info in item['info'].get('childStatVars', []):
          curr_sv_obj = parse_sv(sv_info['definition'])
          if curr_sv_obj.mp != sv_obj.mp:
            continue
          if curr_sv_obj.st != sv_obj.st:
            continue
          if curr_sv_obj.pt != sv_obj.pt:
            continue
          if len(curr_sv_obj.pvs) != len(sv_obj.pvs):
            continue
          res[sv].append(sv_info['id'])
    else:
      # Can use the direct siblings of this sv
      res[sv] = list(map(lambda x: x['id'], svg2childsvs[svg]))
  return res
