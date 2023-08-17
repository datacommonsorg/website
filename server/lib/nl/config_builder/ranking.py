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

from typing import Dict, List

from server.config.subject_page_pb2 import RankingTileSpec
from server.config.subject_page_pb2 import StatVarSpec
from server.config.subject_page_pb2 import Tile
import server.lib.nl.common.constants as constants
from server.lib.nl.config_builder import base
from server.lib.nl.config_builder import map
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType

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


def ranking_chart_block_climate_extremes(builder, pri_place: Place,
                                         pri_svs: List[str], sv2thing: Dict,
                                         attr: Dict):
  footnotes = []
  stat_var_spec_map = {}

  # Add the main ranking tile
  ranking_block, ranking_column = builder.new_chart(attr)
  ranking_tile = ranking_column.tiles.add()
  ranking_tile.type = Tile.TileType.RANKING

  ranking_count = attr.get('ranking_count', _DEFAULT_RANKING_COUNT)

  for _, sv in enumerate(pri_svs):
    _set_ranking_tile_spec(attr['ranking_types'], sv,
                           ranking_tile.ranking_tile_spec, ranking_count)
    sv_key = "ranking-" + sv
    ranking_tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(
        stat_var=sv, name=constants.SV_DISPLAY_SHORT_NAME[sv])
    footnotes.append(sv2thing.footnote[sv])

  ranking_tile.title = ranking_block.title
  ranking_tile.ranking_tile_spec.show_multi_column = True

  # Add the map block
  map_block, map_column = builder.new_chart(attr)

  for _, sv in enumerate(pri_svs):
    if len(map_column.tiles):
      map_column = map_block.columns.add()
    stat_var_spec_map.update(
        map.map_chart_block_nopc(map_column, pri_place, sv, sv2thing, attr))
    map_column.tiles[0].title = sv2thing.name[
        sv]  # override decorated title (too long).

  map_block.title = ''
  map_block.description = ''
  map_block.footnote = '\n\n'.join(footnotes)

  return stat_var_spec_map


def ranking_chart_block_nopc(column, pri_place: Place, pri_sv: str,
                             sv2thing: Dict, attr: Dict):
  # The main tile
  tile = column.tiles.add()
  tile.stat_var_key.append(pri_sv)
  tile.type = Tile.TileType.RANKING
  ranking_count = attr.get('ranking_count', _DEFAULT_RANKING_COUNT)
  _set_ranking_tile_spec(attr['ranking_types'], pri_sv, tile.ranking_tile_spec,
                         ranking_count)
  tile.title = base.decorate_chart_title(title=sv2thing.name[pri_sv],
                                         place=pri_place,
                                         add_date=True,
                                         do_pc=False,
                                         child_type=attr.get('place_type', ''))

  stat_var_spec_map = {}
  stat_var_spec_map[pri_sv] = StatVarSpec(stat_var=pri_sv,
                                          name=sv2thing.name[pri_sv],
                                          unit=sv2thing.unit[pri_sv])

  if not 'skip_map_for_ranking' in attr:
    # Also add a map chart.
    stat_var_spec_map.update(
        map.map_chart_block_nopc(column, pri_place, pri_sv, sv2thing, attr))

  return stat_var_spec_map


def ranking_chart_block_pc(column, pri_place: Place, pri_sv: str,
                           sv2thing: Dict, attr: Dict):
  # The per capita tile
  tile = column.tiles.add()
  sv_key = pri_sv + "_pc"
  tile.stat_var_key.append(sv_key)
  tile.type = Tile.TileType.RANKING
  ranking_count = attr.get('ranking_count', _DEFAULT_RANKING_COUNT)
  _set_ranking_tile_spec(attr['ranking_types'], pri_sv, tile.ranking_tile_spec,
                         ranking_count)
  tile.title = base.decorate_chart_title(title=sv2thing.name[pri_sv],
                                         place=pri_place,
                                         add_date=True,
                                         do_pc=True,
                                         child_type=attr.get('place_type', ''))

  stat_var_spec_map = {}
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=pri_sv,
                                          denom="Count_Person",
                                          name=sv2thing.name[pri_sv])

  if pri_sv in constants.ADDITIONAL_DENOMINATOR_VARS:
    denom_sv, name_suffix = constants.ADDITIONAL_DENOMINATOR_VARS[pri_sv]
    tile = column.tiles.add()
    sv_key = pri_sv + "_" + denom_sv
    tile.stat_var_key.append(sv_key)
    tile.type = Tile.TileType.RANKING
    _set_ranking_tile_spec(attr['ranking_types'], pri_sv,
                           tile.ranking_tile_spec, ranking_count)
    sv_title = sv2thing.name[pri_sv] + " " + name_suffix
    tile.title = base.decorate_chart_title(title=sv_title,
                                           place=pri_place,
                                           add_date=True,
                                           do_pc=False,
                                           child_type=attr.get(
                                               'place_type', ''))

    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=pri_sv,
                                            denom=denom_sv,
                                            name=sv_title)

  # TODO: Maybe add ADDITIONAL_DENOMINATOR_VARS to map too
  if not 'skip_map_for_ranking' in attr:
    # Also add a map chart.
    stat_var_spec_map.update(
        map.map_chart_block_pc(column, pri_place, pri_sv, sv2thing, attr))

  return stat_var_spec_map


def ranking_chart_multivar(column, svs: str, sv2thing: Dict, attr: Dict):
  tile = column.tiles.add()
  tile.type = Tile.TileType.RANKING
  ranking_count = attr.get('ranking_count', _DEFAULT_RANKING_COUNT)
  _set_ranking_tile_spec(attr['ranking_types'], svs[0], tile.ranking_tile_spec,
                         ranking_count)
  stat_var_spec_map = {}
  for sv in svs:
    tile.stat_var_key.append(sv)
    stat_var_spec_map[sv] = StatVarSpec(stat_var=sv,
                                        name=sv2thing.name[sv],
                                        unit=sv2thing.unit[sv])
  return stat_var_spec_map