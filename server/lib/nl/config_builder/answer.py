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
from server.config.subject_page_pb2 import PropertySpec
from server.lib.nl.config_builder import base
from server.lib.nl.fulfillment.types import ChartSpec

_SINGULAR_TITLE = 'The {property} for {entity} is:'


def answer_message_block(builder: base.Builder, cspec: ChartSpec):
  prop = cspec.props[0]
  entity = cspec.entities[0]
  title = _SINGULAR_TITLE.format(property=prop,
                                 entity=entity.name or entity.dcid)
  tile = Tile(type=Tile.TileType.ANSWER_MESSAGE, title=title)
  tile.answer_message_tile_spec.entity = entity.dcid
  tile.answer_message_tile_spec.property.property = prop
  # Only handling out arcs for now
  tile.answer_message_tile_spec.property.direction = PropertySpec.PropertyDirection.OUT
  block = builder.new_chart(cspec, skip_title=True)
  block.columns.add().tiles.append(tile)
