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

from typing import List

from server.config.subject_page_pb2 import Block
from server.config.subject_page_pb2 import Tile
from server.lib.nl.common import utils
import server.lib.nl.common.constants as constants
from server.lib.nl.config_builder import base
from server.lib.nl.detection.types import EventType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType


def event_chart_block(metadata, block, place: Place, event_type: EventType,
                      ranking_types: List[RankingType], event_config):

  # Map EventType to config key.
  event_id = constants.EVENT_TYPE_TO_CONFIG_KEY[event_type]

  if event_id in event_config.metadata.event_type_spec:
    metadata.event_type_spec[event_id].CopyFrom(
        event_config.metadata.event_type_spec[event_id])
  else:
    return

  if not place.place_type in metadata.contained_place_types:
    metadata.contained_place_types[place.place_type] = \
      utils.get_default_child_place_type(place).value

  event_name = metadata.event_type_spec[event_id].name
  if event_type in constants.EVENT_TYPE_TO_DISPLAY_NAME:
    event_name = constants.EVENT_TYPE_TO_DISPLAY_NAME[event_type]
  event_title = base.decorate_chart_title(title=event_name, place=place)
  block.title = event_title
  block.type = Block.DISASTER_EVENT

  if (RankingType.HIGH in ranking_types or
      RankingType.EXTREME in ranking_types):
    tile = block.columns.add().tiles.add()
    # TODO: Handle top event for earthquakes
    if not _maybe_copy_top_event(event_id, block, tile, event_config):
      tile.type = Tile.TOP_EVENT
      tile.title = event_title
      top_event = tile.top_event_tile_spec
      top_event.event_type_key = event_id
      top_event.display_prop.append('name')
      top_event.show_start_date = True
      top_event.show_end_date = True
    else:
      tile.title = base.decorate_chart_title(title=tile.title, place=place)
    tile = block.columns.add().tiles.add()
  else:
    tile = block.columns.add().tiles.add()

  tile.type = Tile.DISASTER_EVENT_MAP
  tile.disaster_event_map_tile_spec.point_event_type_key.append(event_id)
  tile.title = event_title


def _maybe_copy_top_event(event_id, block, tile, event_config):
  # Find a TOP_EVENT tile with given key, because it has
  # additional curated content.
  for c in event_config.categories:
    for b in c.blocks:
      for col in b.columns:
        for t in col.tiles:
          if t.type == Tile.TOP_EVENT and t.top_event_tile_spec.event_type_key == event_id:
            tile.CopyFrom(t)
            block.title = b.title
            block.description = b.description
            return True

  return False
