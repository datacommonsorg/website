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
from server.lib.nl.config_builder import base
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars


def ranked_timeline_collection_block(builder: base.Builder, cspec: ChartSpec,
                                     sv2thing: base.SV2Thing):
  stat_var_spec_map = {}
  cv = cspec.chart_vars

  if len(cspec.places) > 1:
    is_ranking_across_places = True
    block_title = sv2thing.name[cspec.svs[0]]
    block_description = sv2thing.description[cspec.svs[0]]
  else:
    is_ranking_across_places = False
    block_title = cv.title
    block_description = ''

  _, column = builder.new_chart(cspec)
  builder.block.title = base.decorate_block_title(
      title=block_title,
      do_pc=False,
      chart_origin=cspec.chart_origin,
      growth_direction=cv.growth_direction,
      growth_ranking_type=cv.growth_ranking_type)
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


def single_place_single_var_timeline_block(column, place: Place, sv_dcid: str,
                                           sv2thing: base.SV2Thing,
                                           cv: ChartVars, nopc_vars: Set[str]):
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
  if cv.include_percapita and variable.is_percapita_relevant(
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


def single_place_multiple_var_timeline_block(column, place: Place,
                                             svs: List[str],
                                             sv2thing: base.SV2Thing,
                                             cv: ChartVars,
                                             nopc_vars: Set[str]):
  """A column with two chart, all stat vars and per capita"""
  stat_var_spec_map = {}

  if cv.title:
    orig_title = cv.title
  elif len(svs) > 1:
    if cv.orig_sv and sv2thing.name.get(cv.orig_sv):
      orig_sv_name = sv2thing.name[cv.orig_sv]
      orig_title = f'{orig_sv_name} and more'
    elif sv2thing.name.get(svs[0]):
      orig_title = f'{sv2thing.name[svs[0]]} and more'
    else:
      # This should very rarely, if ever, be used.
      orig_title = "Comparison of related variables"
  elif svs:
    # This is the case of multiple places for a single SV
    orig_title = sv2thing.name[svs[0]]

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
  if cv.include_percapita and len(svs_pc) > 0:
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
