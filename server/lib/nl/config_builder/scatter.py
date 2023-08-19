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

from typing import Dict, List, Set

from server.config.subject_page_pb2 import StatVarSpec
from server.config.subject_page_pb2 import Tile
from server.lib.nl.common import variable
from server.lib.nl.config_builder import base
from server.lib.nl.detection.types import Place


def scatter_chart_block(column, pri_place: Place, sv_pair: List[str],
                        child_type: str, sv2thing: Dict, nopc_vars: Set[str]):
  assert len(sv_pair) == 2

  sv_names = [sv2thing.name[sv_pair[0]], sv2thing.name[sv_pair[1]]]
  sv_units = [sv2thing.unit[sv_pair[0]], sv2thing.unit[sv_pair[1]]]
  sv_key_pair = [sv_pair[0] + '_scatter', sv_pair[1] + '_scatter']

  change_to_pc = [False, False]
  is_sv_pc = [
      base.is_sv_percapita(sv_names[0], sv_pair[0]),
      base.is_sv_percapita(sv_names[1], sv_pair[1])
  ]
  if is_sv_pc[0]:
    if not is_sv_pc[1] and variable.is_percapita_relevant(
        sv_pair[1], nopc_vars):
      change_to_pc[1] = True
      sv_names[1] += " Per Capita"
  if is_sv_pc[1]:
    if not is_sv_pc[0] and variable.is_percapita_relevant(
        sv_pair[0], nopc_vars):
      change_to_pc[0] = True
      sv_names[0] += " Per Capita"

  stat_var_spec_map = {}
  for i in range(2):
    if change_to_pc[i]:
      stat_var_spec_map[sv_key_pair[i]] = StatVarSpec(stat_var=sv_pair[i],
                                                      name=sv_names[i],
                                                      denom='Count_Person',
                                                      unit='%')
    else:
      stat_var_spec_map[sv_key_pair[i]] = StatVarSpec(stat_var=sv_pair[i],
                                                      name=sv_names[i],
                                                      unit=sv_units[i])

  # add a scatter config
  tile = column.tiles.add()
  tile.stat_var_key.extend(sv_key_pair)
  tile.type = Tile.TileType.SCATTER
  tile.title = base.decorate_chart_title(
      title=f"{sv_names[0]} (${{yDate}}) vs. {sv_names[1]} (${{xDate}})",
      place=pri_place,
      do_pc=False,
      child_type=child_type)
  tile.scatter_tile_spec.highlight_top_right = True

  return stat_var_spec_map
