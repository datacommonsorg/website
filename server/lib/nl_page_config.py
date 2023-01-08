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

from lib.nl_chart_spec import ChartSpec
from config import subject_page_pb2


def build_page_config(spec: ChartSpec, sv2name: Dict[str, str]):
  # Init
  page_config = subject_page_pb2.SubjectPageConfig()
  # Set metadata
  page_config.metadata.place_dcid.append(spec.main.place)
  page_config.metadata.contained_place_types[
      spec.main.type] = spec.contained.contained_place_type
  # Set category data
  category = page_config.categories.add()

  # Main place
  block = category.blocks.add()
  block.title = spec.main.name
  column = block.columns.add()
  for sv in spec.main.svs:
    tile = column.tiles.add()
    tile.type = subject_page_pb2.Tile.TileType.LINE
    tile.title = sv2name[sv] + ': historical'
    tile.stat_var_key.append(sv)
    category.stat_var_spec[sv].stat_var = sv
    category.stat_var_spec[sv].name = sv2name[sv]

  # Nearby place
  if spec.nearby.sv2places:
    block = category.blocks.add()
    block.title = "Near by {} of {}".format(spec.main.type, spec.main.name)
    column = block.columns.add()
    for sv, places in spec.nearby.sv2places.items():
      tile = column.tiles.add()
      tile.type = subject_page_pb2.Tile.TileType.BAR
      tile.title = sv2name[sv] + ': latest'
      tile.places[:] = places
      tile.stat_var_key.append(sv)
      category.stat_var_spec[sv].stat_var = sv
      category.stat_var_spec[sv].name = sv2name[sv]

  # Contained place
  if spec.contained.svs:
    block = category.blocks.add()
    block.title = "{} in {}".format(spec.contained.contained_place_type,
                                    spec.main.name)
    column = block.columns.add()
    tile = column
    for sv in spec.contained.svs:
      tile = column.tiles.add()
      tile.type = subject_page_pb2.Tile.TileType.MAP
      tile.title = sv2name[sv] + ': latest'
      tile.stat_var_key.append(sv)
      category.stat_var_spec[sv].stat_var = sv
      category.stat_var_spec[sv].name = sv2name[sv]

  return page_config