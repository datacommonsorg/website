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
from server.lib.nl.config_builder import base
from server.lib.nl.fulfillment.types import ChartSpec


def scatter_chart_block(builder: base.Builder, cspec: ChartSpec):
  pri_place = cspec.places[0]
  sv_pair = cspec.svs
  child_type = cspec.place_type
  sv2thing = builder.sv2thing
  nopc_vars = builder.config.nopc_vars

  builder.block
  assert len(sv_pair) == 2

  sv_names = [sv2thing.name[sv_pair[0]], sv2thing.name[sv_pair[1]]]
  sv_units = [sv2thing.unit[sv_pair[0]], sv2thing.unit[sv_pair[1]]]
  sv_key_pair = [sv_pair[0] + '_scatter', sv_pair[1] + '_scatter']

  stat_var_spec_map = {}
  show_pc_block = False
  for i in range(2):
    is_pc = variable.is_percapita_relevant(sv_pair[i], nopc_vars)
    show_pc_block |= is_pc
    stat_var_spec_map[sv_key_pair[i]] = StatVarSpec(
        stat_var=sv_pair[i],
        name=sv_names[i],
        unit=sv_units[i],
        no_per_capita=bool(not is_pc))

  block = builder.new_chart(cspec, skip_title=True)

  if sv_names[0] and sv_names[1]:
    block.title = f'{sv_names[0]} vs. {sv_names[1]}'
  if show_pc_block:
    block.denom = 'Count_Person'
    if builder.default_per_capita:
      block.start_with_denom = True

  # add a scatter config
  tile = block.columns.add().tiles.add()
  tile.stat_var_key.extend(sv_key_pair)
  tile.type = Tile.TileType.SCATTER
  tile.title = base.decorate_chart_title(
      title=f"{sv_names[0]} (${{yDate}}) vs. {sv_names[1]} (${{xDate}})",
      place=pri_place,
      child_type=child_type)
  tile.scatter_tile_spec.highlight_top_right = True

  return stat_var_spec_map
