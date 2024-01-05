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

from server.config.subject_page_pb2 import LineTileSpec
from server.config.subject_page_pb2 import StatVarSpec
from server.config.subject_page_pb2 import Tile
from server.lib.nl.common import variable
from server.lib.nl.config_builder import base
from server.lib.nl.detection.date import get_date_range_strings
from server.lib.nl.detection.date import get_date_string
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars
import server.lib.nl.fulfillment.types as types
from server.lib.nl.fulfillment.utils import get_facet_id


# set the line tile spec field. Only set this if there is a date_range
def _set_line_tile_spec(date_range: types.Date, line_tile_spec: LineTileSpec):
  if not date_range:
    return
  start_date, end_date = get_date_range_strings(date_range)
  line_tile_spec.start_date = start_date
  line_tile_spec.end_date = end_date


def ranked_timeline_collection_block(builder: base.Builder,
                                     cspec: ChartSpec,
                                     sv2thing: types.SV2Thing,
                                     single_date: types.Date = None,
                                     date_range: types.Date = None):
  stat_var_spec_map = {}
  cv = cspec.chart_vars

  if len(cspec.places) > 1:
    is_ranking_across_places = True
    block_title = sv2thing.name[cspec.svs[0]]
    block_description = sv2thing.description[cspec.svs[0]]
    block_footnote = sv2thing.footnote[cspec.svs[0]]
  else:
    is_ranking_across_places = False
    block_title, block_description, block_footnote = builder.get_block_strings(
        cv)

  block = builder.new_chart(cspec)
  block.title = base.decorate_block_title(
      title=block_title,
      chart_origin=cspec.chart_origin,
      growth_direction=cv.growth_direction,
      growth_ranking_type=cv.growth_ranking_type)
  if block_description:
    block.description = block_description
  if block_footnote:
    block.footnote = block_footnote

  date_string = get_date_string(single_date)
  for sv_dcid in cspec.svs:
    for place in cspec.places:
      if is_ranking_across_places:
        chart_title = place.name
      else:
        chart_title = base.decorate_chart_title(title=sv2thing.name[sv_dcid],
                                                place=place)

      facet_id = get_facet_id(sv_dcid, single_date, cv.sv_exist_facet_id or {},
                              [place.dcid])
      # NOTE: It is important to keep the growth-ranking-type in the key.
      # So the same SV can be plotted by itself for the same place multiple
      # times in a chart result.
      sv_key = sv_dcid + '_growth_' + cspec.chart_vars.growth_ranking_type
      if date_string:
        sv_key += f'_{date_string}'
      if facet_id:
        sv_key += f'_{facet_id}'
      tile = Tile(type=Tile.TileType.LINE,
                  title=chart_title,
                  stat_var_key=[sv_key])
      _set_line_tile_spec(date_range, tile.line_tile_spec)
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                              name=sv2thing.name[sv_dcid],
                                              unit=sv2thing.unit[sv_dcid],
                                              date=date_string,
                                              facet_id=facet_id)

      if is_ranking_across_places:
        tile.place_dcid_override = place.dcid
      block.columns.add().tiles.append(tile)

  return stat_var_spec_map


def single_place_single_var_timeline_block(column, place: Place, sv_dcid: str,
                                           sv2thing: types.SV2Thing,
                                           single_date: types.Date,
                                           date_range: types.Date,
                                           cv: ChartVars):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  title = base.decorate_chart_title(title=sv2thing.name[sv_dcid], place=place)

  # Line chart for the stat var
  sv_key = sv_dcid
  date_string = get_date_string(single_date)
  if date_string:
    sv_key += f'_{date_string}'
  facet_id = get_facet_id(sv_dcid, single_date or date_range,
                          cv.sv_exist_facet_id or {}, [place.dcid])
  if facet_id:
    sv_key += f'_{facet_id}'
  tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[sv_key])
  _set_line_tile_spec(date_range, tile.line_tile_spec)
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                          name=sv2thing.name[sv_dcid],
                                          unit=sv2thing.unit[sv_dcid],
                                          date=date_string,
                                          facet_id=facet_id)
  column.tiles.append(tile)
  return stat_var_spec_map


def single_place_multiple_var_timeline_block(column,
                                             place: Place,
                                             svs: List[str],
                                             sv2thing: types.SV2Thing,
                                             cv: ChartVars,
                                             single_date: types.Date = None,
                                             date_range: types.Date = None):
  """A column with two chart, all stat vars and per capita"""
  stat_var_spec_map = {}

  if cv.title:
    orig_title = cv.title
  elif len(svs) > 1:
    if cv.svpg_id and sv2thing.name.get(cv.svpg_id):
      orig_title = sv2thing.name[cv.svpg_id]
    elif sv2thing.name.get(svs[0]):
      orig_title = f'{sv2thing.name[svs[0]]} and more'
    else:
      # This should very rarely, if ever, be used.
      orig_title = "Comparison of related variables"
  elif svs:
    # This is the case of multiple places for a single SV
    orig_title = sv2thing.name[svs[0]]

  title = base.decorate_chart_title(title=orig_title, place=place)

  # Line chart for the stat var
  tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[])
  _set_line_tile_spec(date_range, tile.line_tile_spec)
  date_string = get_date_string(single_date)
  for sv in svs:
    facet_id = get_facet_id(sv, single_date or date_range,
                            cv.sv_exist_facet_id or {}, [place.dcid])
    sv_key = sv
    if date_string:
      sv_key += f'_{date_string}'
    if facet_id:
      sv_key += f'_{facet_id}'
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                            name=sv2thing.name[sv],
                                            unit=sv2thing.unit[sv],
                                            date=date_string,
                                            facet_id=facet_id)
  column.tiles.append(tile)

  return stat_var_spec_map


def multi_place_single_var_timeline_block(builder: base.Builder,
                                          places: List[Place], sv: str,
                                          sv2thing: types.SV2Thing,
                                          cspec: ChartSpec):
  """A column with two chart, all stat vars and per capita"""
  stat_var_spec_map = {}
  cv = cspec.chart_vars

  block_title = sv2thing.name[sv]
  block_description = sv2thing.description[sv]
  block_footnote = sv2thing.footnote[sv]
  block = builder.new_chart(cspec)
  block.title = base.decorate_block_title(title=block_title,
                                          chart_origin=cspec.chart_origin,
                                          growth_direction=cv.growth_direction)
  if block_description:
    block.description = block_description
  if block_footnote:
    block.footnote = block_footnote

  title = base.decorate_chart_title(title=sv2thing.name[sv], place=None)

  # Line chart for the stat var
  sv_key = sv + str(len(places))
  date_string = get_date_string(cspec.single_date)
  place_dcids = list(map(lambda x: x.dcid, cspec.places))
  facet_id = get_facet_id(sv, cspec.single_date or cspec.date_range,
                          cv.sv_exist_facet_id or {}, place_dcids)
  if date_string:
    sv_key += f'_{date_string}'
  if facet_id:
    sv_key += f'_{facet_id}'
  tile = Tile(type=Tile.TileType.LINE,
              title=title,
              stat_var_key=[sv_key],
              comparison_places=[p.dcid for p in places])
  _set_line_tile_spec(cspec.date_range, tile.line_tile_spec)
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                          name=sv2thing.name[sv],
                                          unit=sv2thing.unit[sv],
                                          date=date_string,
                                          facet_id=facet_id)
  block.columns.add().tiles.append(tile)
  return stat_var_spec_map
