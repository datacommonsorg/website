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

# Chart structure for fallback.

from server.config.subject_page_pb2 import Tile
from server.lib.insights.page_type.builder import Builder
import server.lib.nl.fulfillment.types as ftypes

_NO_STAT_MSG = 'Sorry, no statistics found for {topic_name} in {place_name}.  Please explore other topics below.'


def maybe_fallback(state: ftypes.PopulateState, builder: Builder) -> str:
  if (builder.page_config.categories or not state.uttr.places or
      not state.uttr.svs):
    return ''

  # Add place overview as a fallback.
  builder.new_category('', '')
  builder.new_block('')
  tile = builder.new_column().tiles.add()
  tile.type = Tile.TileType.PLACE_OVERVIEW

  # Build a user message
  message = ''
  topic_name = builder.sv2thing.name.get(state.uttr.svs[0])
  place_name = state.uttr.places[0].name
  if topic_name and place_name:
    message = _NO_STAT_MSG.format(topic_name=topic_name, place_name=place_name)

  return message
