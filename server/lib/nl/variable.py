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
from dataclasses import field
from typing import Dict, List

import server.lib.fetch as fetch
import server.services.datacommons as dc


@dataclass
class SV:
  mp: str = ''
  st: str = ''
  pt: str = ''
  md: str = ''
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
    elif k == "md":
      res.md = v
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


def extend_svs(svs: List[str]):
  """Extend stat vars by finding siblings.

    Each SV has a parent SVG associated. Extending an SV would need to trace to
    its parent SVG.

    There are two types of SVGs:

    1)
    https://datacommons.org/browser/dc/g/Person_Gender-Female_Race-AsianAlone,
    which has same set of PVs as its child SV. In this case, its child SVs are
    not siblings as they differ by stat type or other properties. To find
    siblings of a child SV, it's really a task to find this SVG's sibling
    SVGs and get corresponding child SV from each of them.

    2) https://datacommons.org/browser/dc/g/Person_Gender-Female_Race, which has
    PVs and an EXTRA P, so this represents a set of SVs, its child SVs can be
    directly used as siblings.
  """
  if not svs:
    return {}
  sv2svgs = fetch.property_values(svs, "memberOf", True)
  sv2svg = {sv: svg[0] for sv, svg in sv2svgs.items() if svg}
  svg2childsvs = {}
  if not sv2svg:
    return {}
  svginfo = dc.get_variable_group_info(list(sv2svg.values()), [])
  if 'data' not in svginfo:
    return {}
  for item in svginfo['data']:
    svg2childsvs[item['node']] = item['info'].get('childStatVars', [])

  res = {}
  # Extended SV member -> Extended SV list
  reverse_map = {}
  for sv, svg in sv2svg.items():
    if sv in reverse_map:
      res[sv] = reverse_map[sv]
      continue
    res[sv] = []
    svg_obj = parse_svg(svg)
    sv_obj = None
    for child_sv in svg2childsvs[svg]:
      if child_sv['id'] == sv:
        if 'definition' in child_sv:
          sv_obj = parse_sv(child_sv['definition'])
        break
    if not sv_obj:
      continue
    if len(svg_obj.pvs) == len(sv_obj.pvs):
      # There are no direct siblings of this sv in the current svg.
      # need to look for in-direct siblings
      svg_parents = fetch.property_values([svg], "specializationOf", True)[svg]
      if not svg_parents:
        continue
      svg_parent = svg_parents[0]
      svg_siblings = fetch.property_values([svg_parent], "specializationOf",
                                           False)[svg_parent]
      if not svg_siblings:
        continue
      svg_siblings_info = dc.get_variable_group_info(svg_siblings, [])
      for item in svg_siblings_info['data']:
        for sv_info in item['info'].get('childStatVars', []):
          if 'definition' not in sv_info:
            continue
          curr_sv_obj = parse_sv(sv_info['definition'])
          if curr_sv_obj.mp != sv_obj.mp:
            continue
          if curr_sv_obj.st != sv_obj.st:
            continue
          if curr_sv_obj.pt != sv_obj.pt:
            continue
          if curr_sv_obj.md != sv_obj.md:
            continue
          if len(curr_sv_obj.pvs) != len(sv_obj.pvs):
            continue
          res[sv].append(sv_info['id'])
    else:
      # Can use the direct siblings of this sv
      res[sv] = list(map(lambda x: x['id'], svg2childsvs[svg]))
    for sv2 in res[sv]:
      if sv2 == sv:
        continue
      reverse_map[sv2] = res[sv]
  res_ordered = {sv: sorted(ext_svs) for sv, ext_svs in res.items()}
  return res_ordered
