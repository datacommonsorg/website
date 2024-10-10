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

from server.config.subject_page_pb2 import RankingTileSpec
from server.config.subject_page_pb2 import StatVarSpec
from server.config.subject_page_pb2 import Tile
import server.lib.nl.common.constants as constants
from server.lib.nl.common.utils import get_place_key
from server.lib.nl.config_builder import base
from server.lib.nl.config_builder import map
from server.lib.nl.detection.date import get_date_string
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType
from server.lib.nl.fulfillment.types import ChartSpec
import server.lib.nl.fulfillment.types as types

_DEFAULT_RANKING_COUNT = 10


def _set_ranking_tile_spec(ranking_types: List[RankingType], pri_sv: str,
                           ranking_tile_spec: RankingTileSpec,
                           ranking_count: int):
  if ranking_count > 0:
    ranking_tile_spec.ranking_count = ranking_count
  # TODO: Add more robust checks.
  if "CriminalActivities" in pri_sv or 'UnemploymentRate' in pri_sv:
    # first check if "best" or "worst"
    if RankingType.BEST in ranking_types:
      ranking_tile_spec.show_lowest = True
    elif RankingType.WORST in ranking_types:
      ranking_tile_spec.show_highest = True
    else:
      # otherwise, render normally
      if RankingType.HIGH in ranking_types:
        ranking_tile_spec.show_highest = True
      if RankingType.LOW in ranking_types:
        ranking_tile_spec.show_lowest = True
  else:
    if RankingType.HIGH in ranking_types:
      ranking_tile_spec.show_highest = True
    if RankingType.LOW in ranking_types:
      ranking_tile_spec.show_lowest = True
    if RankingType.EXTREME in ranking_types:
      if _does_extreme_mean_low(pri_sv):
        ranking_tile_spec.show_lowest = True
      else:
        ranking_tile_spec.show_highest = True

  # Both are set, use the new single chart.
  if ranking_tile_spec.show_highest and ranking_tile_spec.show_lowest:
    ranking_tile_spec.show_highest = False
    ranking_tile_spec.show_lowest = False
    ranking_tile_spec.show_highest_lowest = True


def _does_extreme_mean_low(sv: str) -> bool:
  _MIN_SV_PATTERNS = ['ProjectedMin', 'Min_Temperature', "MinTemp"]
  for p in _MIN_SV_PATTERNS:
    if p in sv:
      return True
  return False


def ranking_chart_block_climate_extremes(builder: base.Builder,
                                         pri_place: Place, pri_svs: List[str],
                                         sv2thing: types.SV2Thing,
                                         cspec: ChartSpec):
  footnotes = []
  stat_var_spec_map = {}

  # Add the main ranking tile
  ranking_block = builder.new_chart(cspec)
  ranking_tile = ranking_block.columns.add().tiles.add()
  ranking_tile.type = Tile.TileType.RANKING

  ranking_count = cspec.ranking_count if cspec.ranking_count else _DEFAULT_RANKING_COUNT
  date_string = get_date_string(cspec.single_date)
  for _, sv in enumerate(pri_svs):
    _set_ranking_tile_spec(cspec.ranking_types, sv,
                           ranking_tile.ranking_tile_spec, ranking_count)
    sv_key = "ranking-" + sv
    if date_string:
      sv_key += f'-{date_string}'
    ranking_tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(
        stat_var=sv, name=constants.SV_DISPLAY_SHORT_NAME[sv], date=date_string)
    footnotes.append(sv2thing.footnote[sv])

  ranking_tile.title = ranking_block.title
  ranking_tile.ranking_tile_spec.show_multi_column = True

  # Add the map block
  map_block = builder.new_chart(cspec)

  for _, sv in enumerate(pri_svs):
    map_column = map_block.columns.add()
    stat_var_spec_map.update(
        map.map_chart_block(map_column,
                            pri_place,
                            sv,
                            cspec.place_type,
                            sv2thing,
                            single_date=cspec.single_date,
                            date_range=cspec.date_range,
                            sv_place_latest_date=cspec.sv_place_latest_date))
    map_column.tiles[0].title = sv2thing.name[
        sv]  # override decorated title (too long).

  map_block.title = ''
  map_block.description = ''
  map_block.footnote = '\n\n'.join(footnotes)

  return stat_var_spec_map


def ranking_chart_block(column, pri_place: Place, pri_sv: str, child_type: str,
                        sv2thing: types.SV2Thing,
                        ranking_types: List[RankingType], ranking_count: int,
                        single_date: types.Date, date_range: types.Date,
                        sv_place_latest_date):
  # The main tile
  tile = column.tiles.add()
  sv_key = pri_sv
  date_string = ''
  if single_date:
    date_string = get_date_string(single_date)
  elif date_range:
    place_key = get_place_key(pri_place.dcid, child_type)
    date_string = sv_place_latest_date.get(pri_sv, {}).get(place_key, '')
  if date_string:
    sv_key += f'_{date_string}'
  tile.stat_var_key.append(sv_key)
  tile.type = Tile.TileType.RANKING
  ranking_count = ranking_count if ranking_count else _DEFAULT_RANKING_COUNT
  _set_ranking_tile_spec(ranking_types, pri_sv, tile.ranking_tile_spec,
                         ranking_count)
  tile.title = base.decorate_chart_title(title=sv2thing.name[pri_sv],
                                         place=pri_place,
                                         add_date=True,
                                         child_type=child_type)

  stat_var_spec_map = {}
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=pri_sv,
                                          name=sv2thing.name[pri_sv],
                                          unit=sv2thing.unit[pri_sv],
                                          date=date_string)

  return stat_var_spec_map
