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

from typing import Dict

from server.config.subject_page_pb2 import StatVarSpec
from server.config.subject_page_pb2 import Tile
from server.lib.nl import variable
from server.lib.nl.config_builder import base
from server.lib.nl.detection.types import Place


def map_chart_block(column, place: Place, pri_sv: str, sv2thing, attr):
  svs_map = map_chart_block_nopc(column, place, pri_sv, sv2thing, attr)
  if attr['include_percapita'] and variable.is_percapita_relevant(pri_sv):
    svs_map.update(map_chart_block_pc(column, place, pri_sv, sv2thing, attr))
  return svs_map


def map_chart_block_nopc(column, place: Place, pri_sv: str, sv2thing: Dict,
                         attr: Dict):
  # The main tile
  tile = column.tiles.add()
  tile.stat_var_key.append(pri_sv)
  tile.type = Tile.TileType.MAP
  tile.title = base.decorate_chart_title(title=sv2thing.name[pri_sv],
                                         place=place,
                                         add_date=True,
                                         do_pc=False,
                                         child_type=attr.get('place_type', ''))

  stat_var_spec_map = {}
  stat_var_spec_map[pri_sv] = StatVarSpec(stat_var=pri_sv,
                                          name=sv2thing.name[pri_sv],
                                          unit=sv2thing.unit[pri_sv])
  return stat_var_spec_map


def map_chart_block_pc(column, place: Place, pri_sv: str, sv2thing: Dict,
                       attr: Dict):
  tile = column.tiles.add()
  sv_key = pri_sv + "_pc"
  tile.stat_var_key.append(sv_key)
  tile.type = Tile.TileType.MAP
  tile.title = base.decorate_chart_title(title=sv2thing.name[pri_sv],
                                         place=place,
                                         do_pc=True,
                                         add_date=True,
                                         child_type=attr.get('place_type', ''))

  stat_var_spec_map = {}
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=pri_sv,
                                          denom="Count_Person",
                                          name=sv2thing.name[pri_sv])
  return stat_var_spec_map
