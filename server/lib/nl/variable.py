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

from dataclasses import dataclass
from dataclasses import field
import json
import os
from typing import Dict, List

import server.lib.fetch as fetch
import server.lib.nl.constants as constants
import server.lib.nl.utils as utils
import server.services.datacommons as dc

# TODO: This is reading the file on every call.  Improve it!
_CHART_TITLE_CONFIG_RELATIVE_PATH = "../../config/nl_page/chart_titles_by_sv.json"


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


def get_sv_name(all_svs: List[str]) -> Dict:
  sv2name_raw = fetch.property_values(all_svs, 'name')
  uncurated_names = {
      sv: names[0] if names else sv for sv, names in sv2name_raw.items()
  }
  basepath = os.path.dirname(__file__)
  title_config_path = os.path.abspath(
      os.path.join(basepath, _CHART_TITLE_CONFIG_RELATIVE_PATH))
  title_by_sv_dcid = {}
  with open(title_config_path) as f:
    title_by_sv_dcid = json.load(f)

  sv_name_map = {}
  # If a curated name is found return that,
  # Else return the name property for SV.
  for sv in all_svs:
    if sv in constants.SV_DISPLAY_NAME_OVERRIDE:
      sv_name_map[sv] = constants.SV_DISPLAY_NAME_OVERRIDE[sv]
    elif sv in title_by_sv_dcid:
      sv_name_map[sv] = clean_sv_name(title_by_sv_dcid[sv])
    else:
      sv_name_map[sv] = clean_sv_name(uncurated_names[sv])

  return sv_name_map


def get_sv_unit(all_svs: List[str]) -> Dict:
  sv_unit_map = {}
  for sv in all_svs:
    # If the dcid has "percent", the unit should be "%"
    if "Percent" in sv:
      sv_unit_map[sv] = "%"
    else:
      sv_unit_map[sv] = ""
  return sv_unit_map


def get_sv_description(all_svs: List[str]) -> Dict:
  sv_desc_map = {}
  for sv in all_svs:
    sv_desc_map[sv] = constants.SV_DISPLAY_DESCRIPTION_OVERRIDE.get(sv, '')
  return sv_desc_map


# TODO: Remove this hack by fixing the name in schema and config.
def clean_sv_name(name: str) -> str:
  _PREFIXES = [
      'Population of People Working in the ',
      'Population of People Working in ',
      'Population of People ',
      'Population Working in the ',
      'Population Working in ',
      'Number of the ',
      'Number of ',
  ]
  _SUFFIXES = [
      ' Workers',
  ]
  for p in _PREFIXES:
    if name.startswith(p):
      name = name[len(p):]
  for s in _SUFFIXES:
    if name.endswith(s):
      name = name[:-len(s)]
  return name


def get_sv_footnote(all_svs: List[str]) -> Dict:
  sv2footnote_raw = fetch.property_values(all_svs, 'footnote')
  uncurated_footnotes = {
      sv: footnotes[0] if footnotes else ''
      for sv, footnotes in sv2footnote_raw.items()
  }
  sv_map = {}
  for sv in all_svs:
    if sv in constants.SV_DISPLAY_FOOTNOTE_OVERRIDE:
      sv_map[sv] = constants.SV_DISPLAY_FOOTNOTE_OVERRIDE[sv]
    else:
      sv_map[sv] = uncurated_footnotes[sv]
  return sv_map


def get_only_svs(svs: List[str]) -> List[str]:
  ret = []
  for sv in svs:
    if utils.is_sv(sv):
      ret.append(sv)
  return ret


#
# Per-capita handling
#

_SV_PARTIAL_DCID_NO_PC = [
    'Temperature',
    'Precipitation',
    "BarometricPressure",
    "CloudCover",
    "PrecipitableWater",
    "Rainfall",
    "Snowfall",
    "Visibility",
    "WindSpeed",
    "ConsecutiveDryDays",
    "Percent",
    "Area_",
    "Median_",
    "LifeExpectancy_",
    "AsFractionOf",
    "AsAFractionOfCount",
    "UnemploymentRate_",
    "Mean_Income_",
    "GenderIncomeInequality_",
    "FertilityRate_",
    "GrowthRate_",
    "sdg/",
]

_SV_FULL_DCID_NO_PC = ["Count_Person"]


def is_percapita_relevant(sv_dcid: str) -> bool:
  for skip_phrase in _SV_PARTIAL_DCID_NO_PC:
    if skip_phrase in sv_dcid:
      return False
  for skip_sv in _SV_FULL_DCID_NO_PC:
    if skip_sv == sv_dcid:
      return False
  return True
