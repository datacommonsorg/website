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
from server.lib.nl.config_builder import base
from server.lib.nl.detection.date import get_date_string
import server.lib.nl.fulfillment.types as types


def highlight_block(column,
                    place,
                    sv,
                    sv2thing: types.SV2Thing,
                    single_date: types.Date = None,
                    date_range: types.Date = None,
                    sv_place_latest_date=None):
  chart_title = base.decorate_chart_title(title=sv2thing.name[sv], place=place)

  sv_key = sv
  date_string = ''
  if single_date:
    date_string = get_date_string(single_date)
  elif date_range:
    date_string = sv_place_latest_date.get(sv, {}).get(place.dcid, '')
  if date_string:
    sv_key += f'_{date_string}'
  tile = Tile(type=Tile.TileType.HIGHLIGHT,
              title=chart_title,
              description=chart_title,
              stat_var_key=[sv_key])
  stat_var_spec_map = {}
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                          name=sv2thing.name[sv],
                                          unit=sv2thing.unit[sv],
                                          date=date_string)
  column.tiles.append(tile)
  return stat_var_spec_map
