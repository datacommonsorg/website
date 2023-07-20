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

from typing import List, Set

from server.config.subject_page_pb2 import StatVarSpec
from server.config.subject_page_pb2 import Tile
from server.lib.nl.common import variable
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.config_builder import base
from server.lib.nl.detection.types import Place


def multiple_place_bar_block(column, places: List[Place], svs: List[str],
                             sv2thing, attr, nopc_vars: Set[str]):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  if attr['title']:
    # This happens in the case of Topics
    orig_title = attr['title']
  elif len(svs) > 1:
    if attr.get('class') == ChartOriginType.SECONDARY_CHART and attr.get(
        'orig_sv') and sv2thing.name.get(attr.get('orig_sv', '')):
      # This suggests we are comparing against SV peers from SV extension
      orig_sv_name = sv2thing.name[attr['orig_sv']]
      orig_title = f'{orig_sv_name} compared with other variables'
    else:
      orig_title = "Compared with Other Variables"
  else:
    # This is the case of multiple places for a single SV
    orig_title = sv2thing.name[svs[0]]

  title_suffix = ''
  if attr.get('title_suffix', None):
    title_suffix = attr['title_suffix']

  if len(places) == 1:
    title = base.decorate_chart_title(title=orig_title,
                                      place=places[0],
                                      add_date=True,
                                      title_suffix=title_suffix)
    pc_title = base.decorate_chart_title(title=orig_title,
                                         place=places[0],
                                         add_date=True,
                                         do_pc=True,
                                         title_suffix=title_suffix)
  else:
    title = base.decorate_chart_title(title=orig_title,
                                      add_date=True,
                                      place=None,
                                      title_suffix=title_suffix)
    pc_title = base.decorate_chart_title(title=orig_title,
                                         add_date=True,
                                         place=None,
                                         do_pc=True,
                                         title_suffix=title_suffix)

  # Total
  tile = Tile(type=Tile.TileType.BAR,
              title=title,
              comparison_places=[x.dcid for x in places])
  for sv in svs:
    sv_key = sv + "_multiple_place_bar_block"
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                            name=sv2thing.name[sv],
                                            unit=sv2thing.unit[sv])

  column.tiles.append(tile)
  # Per Capita
  svs_pc = list(
      filter(lambda x: variable.is_percapita_relevant(x, nopc_vars), svs))
  if attr['include_percapita'] and len(svs_pc) > 0:
    tile = Tile(type=Tile.TileType.BAR,
                title=pc_title,
                comparison_places=[x.dcid for x in places])
    for sv in svs_pc:
      sv_key = sv + "_multiple_place_bar_block_pc"
      tile.stat_var_key.append(sv_key)
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                              denom="Count_Person",
                                              name=sv2thing.name[sv])

    column.tiles.append(tile)
  return stat_var_spec_map
