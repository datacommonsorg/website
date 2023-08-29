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

from server.config.subject_page_pb2 import BarTileSpec
from server.config.subject_page_pb2 import StatVarSpec
from server.config.subject_page_pb2 import Tile
from server.lib.nl.config_builder import base
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType
import server.lib.nl.fulfillment.types
from server.lib.nl.fulfillment.types import ChartVars

_MAX_VARIABLE_LIMIT = 15


def multiple_place_bar_block(column,
                             places: List[Place],
                             svs: List[str],
                             sv2thing: server.lib.nl.fulfillment.types.SV2Thing,
                             cv: ChartVars,
                             ranking_types: List[RankingType] = []):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  if cv.title:
    # This happens in the case of Topics
    orig_title = cv.title
  elif len(svs) > 1:
    if cv.svpg_id and sv2thing.name.get(cv.svpg_id):
      # This suggests we are comparing against SV peers from SV extension
      orig_title = sv2thing.name[cv.svpg_id]
    elif sv2thing.name.get(svs[0]):
      orig_title = f'{sv2thing.name[svs[0]]} and more'
    else:
      # This should very rarely, if ever, be used.
      orig_title = "Comparison of related variables"
  else:
    # This is the case of multiple places for a single SV
    orig_title = sv2thing.name[svs[0]]

  title_suffix = ''
  if cv.title_suffix:
    title_suffix = cv.title_suffix

  if len(places) == 1:
    title = base.decorate_chart_title(title=orig_title,
                                      place=places[0],
                                      add_date=True,
                                      title_suffix=title_suffix)
  else:
    title = base.decorate_chart_title(title=orig_title,
                                      add_date=True,
                                      place=None,
                                      title_suffix=title_suffix)

  # Total
  tile = Tile(type=Tile.TileType.BAR,
              title=title,
              comparison_places=[x.dcid for x in places])
  for sv in svs:
    sv_key = sv + "_multiple_place_bar_block"
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                            name=sv2thing.name[sv],
                                            unit=sv2thing.unit[sv])

  tile.bar_tile_spec.max_variables = _MAX_VARIABLE_LIMIT
  # Always show top ones by default since we truncate #vars.
  tile.bar_tile_spec.sort = BarTileSpec.DESCENDING
  if RankingType.LOW in ranking_types and RankingType.HIGH not in ranking_types:
    tile.bar_tile_spec.sort = BarTileSpec.ASCENDING
  column.tiles.append(tile)
  return stat_var_spec_map
