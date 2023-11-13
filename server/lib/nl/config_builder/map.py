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
from server.lib.nl.detection.types import Place
import server.lib.nl.fulfillment.types


def map_chart_block(column, place: Place, pri_sv: str, child_type: str,
                    sv2thing: server.lib.nl.fulfillment.types.SV2Thing):
  # The main tile
  tile = column.tiles.add()
  tile.stat_var_key.append(pri_sv)
  tile.type = Tile.TileType.MAP
  tile.title = base.decorate_chart_title(title=sv2thing.name[pri_sv],
                                         place=place,
                                         add_date=True,
                                         child_type=child_type)

  stat_var_spec_map = {}
  stat_var_spec_map[pri_sv] = StatVarSpec(stat_var=pri_sv,
                                          name=sv2thing.name[pri_sv],
                                          unit=sv2thing.unit[pri_sv])
  return stat_var_spec_map