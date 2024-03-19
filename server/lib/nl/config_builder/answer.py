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

from server.config.subject_page_pb2 import PropertySpec
from server.config.subject_page_pb2 import Tile
from server.lib.nl.config_builder import base
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import Entity

_ARROW_TO_DIRECTION = {
    '->': PropertySpec.PropertyDirection.OUT,
    '<-': PropertySpec.PropertyDirection.IN
}
_PROP_ARROW_LENGTH = 2
_OUT_TITLE = 'The {property} for {entity} is:'
_IN_TITLE = '{entity} is the {property} for:'


def _get_prop_and_direction(
    prop_str: str) -> tuple[str, PropertySpec.PropertyDirection]:
  arrow = prop_str[:_PROP_ARROW_LENGTH]
  prop = prop_str[_PROP_ARROW_LENGTH:]
  return prop, _ARROW_TO_DIRECTION.get(arrow)


def answer_message_block(builder: base.Builder, cspec: ChartSpec):
  entity = cspec.entities[0]
  prop, direction = _get_prop_and_direction(cspec.props[0])
  title_format_str = _OUT_TITLE if direction == PropertySpec.PropertyDirection.OUT else _IN_TITLE
  title = title_format_str.format(property=prop,
                                  entity=entity.name or entity.dcid)
  tile = Tile(type=Tile.TileType.ANSWER_MESSAGE,
              title=title,
              entities=[entity.dcid])
  tile.answer_message_tile_spec.property.property = prop
  tile.answer_message_tile_spec.property.direction = direction
  block = builder.new_chart(cspec, skip_title=True)
  block.columns.add().tiles.append(tile)
