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
from server.lib.nl.config_builder.formatting_utils import \
    title_for_two_or_more_svs
from server.lib.nl.detection.date import get_date_string
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import RankingType
from server.lib.nl.explore.params import is_special_dc
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.types import Sv2Place2Date
import server.lib.nl.fulfillment.types as types

_MAX_VARIABLE_LIMIT = 15
_MAX_PLACES_LIMIT = 15


# Get best date to use for an sv and list of places.
def _get_best_date(sv_place_latest_date: Sv2Place2Date, sv: str,
                   places: List[Place]):
  dates_seen = {}
  best_date = ''
  for place in places:
    date = sv_place_latest_date.get(sv, {}).get(place.dcid, '')
    if not date:
      continue
    date_occurrences = dates_seen.get(date, 0) + 1
    dates_seen[date] = date_occurrences
    if date_occurrences > dates_seen.get(best_date, 0):
      best_date = date
  return best_date


def multiple_place_bar_block(column,
                             places: List[Place],
                             svs: List[str],
                             sv2thing: types.SV2Thing,
                             cv: ChartVars,
                             single_date: types.Date = None,
                             date_range: types.Date = None,
                             sv_place_latest_date=None,
                             sort_order: any = None):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  if cv.title:
    # This happens in the case of Topics
    orig_title = cv.title
  elif len(svs) > 1:
    if cv.svpg_id and sv2thing.name.get(cv.svpg_id):
      # This suggests we are comparing against SV peers from SV extension
      orig_title = sv2thing.name[cv.svpg_id]
    else:
      orig_title = title_for_two_or_more_svs(svs, sv2thing.name)
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
  date_string = ''
  if single_date:
    date_string = get_date_string(single_date)
  for sv in svs:
    if date_range:
      date_string = _get_best_date(sv_place_latest_date, sv, places)
    sv_key = sv + "_multiple_place_bar_block"
    if date_string:
      sv_key += f'_{date_string}'
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                            name=sv2thing.name[sv],
                                            unit=sv2thing.unit[sv],
                                            date=date_string)

  tile.bar_tile_spec.max_variables = _MAX_VARIABLE_LIMIT
  tile.bar_tile_spec.max_places = _MAX_PLACES_LIMIT
  if sort_order:
    tile.bar_tile_spec.sort = sort_order
  column.tiles.append(tile)
  return stat_var_spec_map


def get_sort_order(state: PopulateState, cspec: ChartSpec):
  # Use no default sort_order for special DC, since UN
  # want the order to be as provided in variable groupings.
  sort_order = None if is_special_dc(state.uttr.insight_ctx) \
    else BarTileSpec.DESCENDING

  if (RankingType.LOW in cspec.ranking_types and
      RankingType.HIGH not in cspec.ranking_types):
    sort_order = BarTileSpec.ASCENDING
  elif RankingType.HIGH in cspec.ranking_types:
    sort_order = BarTileSpec.DESCENDING

  return sort_order