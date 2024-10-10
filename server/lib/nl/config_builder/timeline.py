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
from server.lib.nl.config_builder import base
from server.lib.nl.config_builder.formatting_utils import \
    title_for_two_or_more_svs
from server.lib.nl.detection.date import get_date_range_strings
from server.lib.nl.detection.date import get_date_string
from server.lib.nl.detection.types import Place
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars
import server.lib.nl.fulfillment.types as types
from server.lib.nl.fulfillment.utils import get_facet_id


# sets the line tile spec field for a date range
def _set_date_range(date_range: types.Date,
                    sv_place_facet: types.Sv2Place2Facet,
                    line_tile_spec: LineTileSpec) -> tuple[str, str]:
  start_date, end_date = get_date_range_strings(date_range)
  # start_date and end_date should be the same length, but one of them can be
  # empty so to get their granularity, get the max length between the two
  lowest_granularity_length = max(len(start_date), len(end_date))
  # go through all the facets to see if there are any that are lower
  # granularity than the date range. If so, we want to cut start_date and
  # end_date to that lower granularity to match the frontend that cuts off
  # data with date[:len(start_date)] < start_date, but for a start date like
  # 2020-04, we still want to show 2020 data.
  for place_facet in sv_place_facet.values():
    for facet in place_facet.values():
      lowest_granularity_length = min(
          len(facet.get('earliestDate', facet.get('latestDate', ''))),
          lowest_granularity_length)
  line_tile_spec.start_date = start_date[:lowest_granularity_length]
  line_tile_spec.end_date = end_date[:lowest_granularity_length]


# set the line tile spec field for a date range or a single date.
def _set_line_tile_spec(date_range: types.Date, single_date: types.Date,
                        line_tile_spec: LineTileSpec,
                        sv_place_facet: types.Sv2Place2Facet):

  if date_range:
    _set_date_range(date_range, sv_place_facet, line_tile_spec)
  elif single_date:
    date = get_date_string(single_date)
    line_tile_spec.highlight_date = date


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
      facet_id = get_facet_id(sv_dcid, cspec.sv_place_facet, [place.dcid])
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
      _set_line_tile_spec(date_range, single_date, tile.line_tile_spec,
                          cspec.sv_place_facet)
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                              name=sv2thing.name[sv_dcid],
                                              unit=sv2thing.unit[sv_dcid],
                                              date=date_string,
                                              facet_id=facet_id)

      if is_ranking_across_places:
        tile.place_dcid_override = place.dcid
      block.columns.add().tiles.append(tile)

  return stat_var_spec_map


def single_place_single_var_timeline_block(
    column, place: Place, sv_dcid: str, sv2thing: types.SV2Thing,
    single_date: types.Date, date_range: types.Date,
    sv_place_facet: types.Sv2Place2Facet):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  title = base.decorate_chart_title(title=sv2thing.name[sv_dcid], place=place)

  # Line chart for the stat var
  sv_key = sv_dcid
  date_string = get_date_string(single_date)
  if date_string:
    sv_key += f'_{date_string}'
  facet_id = get_facet_id(sv_dcid, sv_place_facet, [place.dcid])
  if facet_id:
    sv_key += f'_{facet_id}'
  tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[sv_key])
  _set_line_tile_spec(date_range, single_date, tile.line_tile_spec,
                      sv_place_facet)
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                          name=sv2thing.name[sv_dcid],
                                          unit=sv2thing.unit[sv_dcid],
                                          date=date_string,
                                          facet_id=facet_id)
  column.tiles.append(tile)
  return stat_var_spec_map


def single_place_multiple_var_timeline_block(
    column,
    place: Place,
    svs: List[str],
    sv2thing: types.SV2Thing,
    cv: ChartVars,
    single_date: types.Date = None,
    date_range: types.Date = None,
    sv_place_facet: types.Sv2Place2Facet = None):
  """A column with two chart, all stat vars and per capita"""
  stat_var_spec_map = {}

  if cv.title:
    orig_title = cv.title
  elif len(svs) > 1:
    if cv.svpg_id and sv2thing.name.get(cv.svpg_id):
      orig_title = sv2thing.name[cv.svpg_id]
    else:
      orig_title = title_for_two_or_more_svs(svs, sv2thing.name)
  elif svs:
    # This is the case of multiple places for a single SV
    orig_title = sv2thing.name[svs[0]]

  title = base.decorate_chart_title(title=orig_title, place=place)

  # Line chart for the stat var
  tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[])
  _set_line_tile_spec(date_range, single_date, tile.line_tile_spec,
                      sv_place_facet)
  date_string = get_date_string(single_date)
  for sv in svs:
    facet_id = get_facet_id(sv, sv_place_facet, [place.dcid])
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
  facet_id = get_facet_id(sv, cspec.sv_place_facet, place_dcids)
  if date_string:
    sv_key += f'_{date_string}'
  if facet_id:
    sv_key += f'_{facet_id}'
  tile = Tile(type=Tile.TileType.LINE,
              title=title,
              stat_var_key=[sv_key],
              comparison_places=[p.dcid for p in places])
  _set_line_tile_spec(cspec.date_range, cspec.single_date, tile.line_tile_spec,
                      cspec.sv_place_facet)
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                          name=sv2thing.name[sv],
                                          unit=sv2thing.unit[sv],
                                          date=date_string,
                                          facet_id=facet_id)
  block.columns.add().tiles.append(tile)
  return stat_var_spec_map
