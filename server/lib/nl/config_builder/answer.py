# Copyright 2024 Google LLC
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

from server.config.subject_page_pb2 import Tile
from server.lib.nl.config_builder import base
from server.lib.nl.fulfillment.types import ChartSpec


def answer_message_block(builder: base.Builder, cspec: ChartSpec):
  entity = cspec.entities[0]
  tile = Tile(type=Tile.TileType.ANSWER_MESSAGE,
              title=cspec.chart_vars.title,
              entities=[entity.dcid])
  tile.answer_message_tile_spec.property_expr = cspec.props[0]
  block = builder.new_chart(cspec, skip_title=True)
  block.columns.add().tiles.append(tile)


def answer_table_block(builder: base.Builder, cspec: ChartSpec):
  tile = Tile(type=Tile.TileType.ANSWER_TABLE,
              title=cspec.chart_vars.title,
              entities=[e.dcid for e in cspec.entities])
  for prop in cspec.props:
    column = tile.answer_table_tile_spec.columns.add()
    column.header = base.get_property_display_name(prop)
    column.property_expr = prop
  block = builder.new_chart(cspec, skip_title=True)
  block.columns.add().tiles.append(tile)
