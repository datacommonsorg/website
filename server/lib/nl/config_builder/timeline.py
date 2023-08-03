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

from server.config.subject_page_pb2 import StatVarSpec
from server.config.subject_page_pb2 import Tile
from server.lib.nl.common import variable
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartSpec
from server.lib.nl.config_builder import base


def ranked_timeline_collection_block(builder: base.Builder, cspec: ChartSpec,
                                     sv2thing: base.SV2Thing):
  stat_var_spec_map = {}
  attr = cspec.attr

  if len(cspec.places) > 1:
    is_ranking_across_places = True
    block_title = sv2thing.name[cspec.svs[0]]
    block_description = sv2thing.description[cspec.svs[0]]
  else:
    is_ranking_across_places = False
    block_title = attr.get('title', '')
    block_description = ''

  _, column = builder.new_chart(cspec.attr)
  builder.block.title = base.decorate_block_title(
      title=block_title,
      do_pc=False,
      chart_origin=attr['class'],
      growth_direction=attr['growth_direction'],
      growth_ranking_type=attr['growth_ranking_type'])
  builder.block.description = block_description

  for sv_dcid in cspec.svs:
    for place in cspec.places:
      if is_ranking_across_places:
        chart_title = place.name
      else:
        chart_title = base.decorate_chart_title(title=sv2thing.name[sv_dcid],
                                                place=place)

      sv_key = sv_dcid
      tile = Tile(type=Tile.TileType.LINE,
                  title=chart_title,
                  stat_var_key=[sv_key])
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                              name=sv2thing.name[sv_dcid],
                                              unit=sv2thing.unit[sv_dcid])

      if is_ranking_across_places:
        tile.place_dcid_override = place.dcid
      column.tiles.append(tile)

  return stat_var_spec_map


def single_place_single_var_timeline_block(column, place, sv_dcid, sv2thing,
                                           attr, nopc_vars):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  title = base.decorate_chart_title(title=sv2thing.name[sv_dcid], place=place)

  # Line chart for the stat var
  sv_key = sv_dcid
  tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[sv_key])
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                          name=sv2thing.name[sv_dcid],
                                          unit=sv2thing.unit[sv_dcid])
  column.tiles.append(tile)

  # Line chart for the stat var per capita
  if attr['include_percapita'] and variable.is_percapita_relevant(
      sv_dcid, nopc_vars):
    title = base.decorate_chart_title(title=sv2thing.name[sv_dcid],
                                      place=place,
                                      do_pc=True)
    sv_key = sv_dcid + '_pc'
    tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[sv_key])
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                            name=sv2thing.name[sv_dcid],
                                            denom="Count_Person")
    column.tiles.append(tile)
  return stat_var_spec_map


def single_place_multiple_var_timeline_block(column, place, svs, sv2thing, attr,
                                             nopc_vars):
  """A column with two chart, all stat vars and per capita"""
  stat_var_spec_map = {}

  if attr.get('title'):
    orig_title = attr['title']
  elif attr.get('class') == ChartOriginType.SECONDARY_CHART and attr.get(
      'orig_sv') and sv2thing.name.get(attr['orig_sv']):
    orig_sv_name = sv2thing.name[attr['orig_sv']]
    orig_title = f'{orig_sv_name} compared with other variables'
  else:
    orig_title = "Compared with Other Variables"
  title = base.decorate_chart_title(title=orig_title, place=place)

  # Line chart for the stat var
  tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[])
  for sv in svs:
    sv_key = sv
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                            name=sv2thing.name[sv],
                                            unit=sv2thing.unit[sv])
  column.tiles.append(tile)

  # Line chart for the stat var per capita
  svs_pc = list(
      filter(lambda x: variable.is_percapita_relevant(x, nopc_vars), svs))
  if attr['include_percapita'] and len(svs_pc) > 0:
    title = base.decorate_chart_title(title=orig_title, place=place, do_pc=True)
    tile = Tile(type=Tile.TileType.LINE, title=title)
    for sv in svs_pc:
      sv_key = sv + '_pc'
      tile.stat_var_key.append(sv_key)
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                              name=sv2thing.name[sv],
                                              denom="Count_Person")
    column.tiles.append(tile)

  return stat_var_spec_map
