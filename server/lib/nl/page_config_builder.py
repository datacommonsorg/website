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

from dataclasses import dataclass
import logging
import time
from typing import Dict, List

from server.config.subject_page_pb2 import Block
from server.config.subject_page_pb2 import RankingTileSpec
from server.config.subject_page_pb2 import StatVarSpec
from server.config.subject_page_pb2 import SubjectPageConfig
from server.config.subject_page_pb2 import Tile
from server.lib.nl import utils
import server.lib.nl.constants as constants
from server.lib.nl.detection import EventType
from server.lib.nl.detection import Place
from server.lib.nl.detection import RankingType
from server.lib.nl.utterance import ChartOriginType
from server.lib.nl.utterance import ChartSpec
from server.lib.nl.utterance import ChartType
from server.lib.nl.utterance import QueryType
from server.lib.nl.utterance import TimeDeltaType
from server.lib.nl.utterance import Utterance


class PageConfigBuilder:

  def __init__(self, uttr):
    self.uttr = uttr
    self.page_config = SubjectPageConfig()

    metadata = self.page_config.metadata
    first_chart = uttr.rankedCharts[0]
    main_place = first_chart.places[0]
    metadata.place_dcid.append(main_place.dcid)
    if (first_chart.chart_type == ChartType.MAP_CHART or
        first_chart.chart_type == ChartType.RANKING_CHART or
        first_chart.chart_type == ChartType.SCATTER_CHART):
      metadata.contained_place_types[main_place.place_type] = \
        first_chart.attr['place_type']

    self.category = self.page_config.categories.add()
    self.block = None
    self.column = None
    self.prev_block_id = -1

    self.ignore_block_id_check = False
    if (uttr.query_type == QueryType.RANKING_ACROSS_PLACES or
        uttr.query_type == QueryType.TIME_DELTA_ACROSS_PLACES or
        uttr.query_type == QueryType.TIME_DELTA_ACROSS_VARS or
        uttr.query_type == QueryType.FILTER_WITH_SINGLE_VAR or
        uttr.query_type == QueryType.FILTER_WITH_DUAL_VARS):
      self.ignore_block_id_check = True

  # Returns a Block and a Column
  def new_chart(self, attr: Dict) -> any:
    block_id = attr['block_id']
    if block_id != self.prev_block_id or self.ignore_block_id_check:
      if self.block:
        self.category.blocks.append(self.block)
      self.block = Block()
      if attr['title']:
        self.block.title = _decorate_block_title(title=attr['title'],
                                                 chart_origin=attr.get(
                                                     'class', None))
      if attr['description']:
        self.block.description = attr['description']
      self.column = self.block.columns.add()
      self.prev_block_id = block_id
    return self.block, self.column

  def update_sv_spec(self, stat_var_spec_map):
    for sv_key, spec in stat_var_spec_map.items():
      self.category.stat_var_spec[sv_key].CopyFrom(spec)

  def finalize(self) -> SubjectPageConfig:
    if self.block:
      self.category.blocks.append(self.block)
      self.block = None


# A structure with maps from SV DCID to different things.
@dataclass
class SV2Thing:
  name: Dict
  unit: Dict
  description: Dict
  footnote: Dict


#
# Given an Utterance, build the final Chart config proto.
#
def build_page_config(
    uttr: Utterance,
    event_config: SubjectPageConfig = None) -> SubjectPageConfig:

  builder = PageConfigBuilder(uttr)

  # Get names of all SVs
  all_svs = set()
  for cspec in uttr.rankedCharts:
    all_svs.update(cspec.svs)
  all_svs = list(all_svs)
  start = time.time()
  sv2thing = SV2Thing(
      name=utils.get_sv_name(all_svs),
      unit=utils.get_sv_unit(all_svs),
      description=utils.get_sv_description(all_svs),
      footnote=utils.get_sv_footnote(all_svs),
  )
  uttr.counters.timeit('get_sv_details', start)

  # Add a human answer to the query
  # try:
  #   desc = lib_desc.build_category_description(uttr, sv2name)
  #   if desc:
  #     builder.category.description = desc
  # except Exception as err:
  #   utils.update_counter(uttr.counters, 'failed_category_description_build',
  #                        str(err))
  #   logging.warning("Error building category description: %s", str(err))

  # Build chart blocks
  for cspec in uttr.rankedCharts:
    if not cspec.places:
      continue
    stat_var_spec_map = {}

    # Call per-chart handlers.
    if cspec.chart_type == ChartType.PLACE_OVERVIEW:
      place = cspec.places[0]
      block, column = builder.new_chart(cspec.attr)
      block.title = place.name
      _place_overview_block(column)

    elif cspec.chart_type == ChartType.TIMELINE_CHART:
      _, column = builder.new_chart(cspec.attr)
      if len(cspec.svs) > 1:
        stat_var_spec_map = _single_place_multiple_var_timeline_block(
            column, cspec.places[0], cspec.svs, sv2thing, cspec.attr)
      else:
        stat_var_spec_map = _single_place_single_var_timeline_block(
            column, cspec.places[0], cspec.svs[0], sv2thing, cspec.attr)

    elif cspec.chart_type == ChartType.BAR_CHART:
      _, column = builder.new_chart(cspec.attr)
      stat_var_spec_map = _multiple_place_bar_block(column, cspec.places,
                                                    cspec.svs, sv2thing,
                                                    cspec.attr)

    elif cspec.chart_type == ChartType.MAP_CHART:
      if not _is_map_or_ranking_compatible(cspec):
        continue
      for sv in cspec.svs:
        _, column = builder.new_chart(cspec.attr)
        stat_var_spec_map.update(
            _map_chart_block(column, cspec.places[0], sv, sv2thing, cspec.attr))

    elif cspec.chart_type == ChartType.RANKING_CHART:
      if not _is_map_or_ranking_compatible(cspec):
        continue
      pri_place = cspec.places[0]

      if cspec.attr['source_topic'] == 'dc/topic/ProjectedClimateExtremes':
        stat_var_spec_map.update(
            _ranking_chart_block_climate_extremes(builder, pri_place, cspec.svs,
                                                  sv2thing, cspec.attr))
      else:
        # Do not let the builder decide the title and description.
        cspec.attr['title'] = ''
        cspec.attr['description'] = ''

        for sv in cspec.svs:
          block, column = builder.new_chart(cspec.attr)
          block.footnote = sv2thing.footnote[sv]

          if not builder.block.title and builder.ignore_block_id_check:
            builder.block.title = sv2thing.name[sv]
            builder.block.description = sv2thing.description[sv]

          chart_origin = cspec.attr.get('class', None)
          builder.block.title = _decorate_block_title(title=builder.block.title,
                                                      chart_origin=chart_origin)
          stat_var_spec_map.update(
              _ranking_chart_block_nopc(column, pri_place, sv, sv2thing,
                                        cspec.attr))
          if cspec.attr['include_percapita'] and utils.is_percapita_relevant(
              sv):
            if not 'skip_map_for_ranking' in cspec.attr:
              block, column = builder.new_chart(cspec.attr)
            stat_var_spec_map.update(
                _ranking_chart_block_pc(column, pri_place, sv, sv2thing,
                                        cspec.attr))
    elif cspec.chart_type == ChartType.SCATTER_CHART:
      _, column = builder.new_chart(cspec.attr)
      stat_var_spec_map = _scatter_chart_block(column, cspec.places[0],
                                               cspec.svs, sv2thing, cspec.attr)

    elif cspec.chart_type == ChartType.EVENT_CHART and event_config:
      block, column = builder.new_chart(cspec.attr)
      _event_chart_block(builder.page_config.metadata, block, column,
                         cspec.places[0], cspec.event, cspec.attr, event_config)

    elif cspec.chart_type == ChartType.RANKED_TIMELINE_COLLECTION:
      stat_var_spec_map = _ranked_timeline_collection_block(
          builder, cspec, sv2thing)

    builder.update_sv_spec(stat_var_spec_map)

  builder.finalize()
  return builder.page_config


def _ranked_timeline_collection_block(builder: PageConfigBuilder,
                                      cspec: ChartSpec, sv2thing: SV2Thing):
  stat_var_spec_map = {}
  attr = cspec.attr

  if len(cspec.places) > 1:
    is_ranking_across_places = True
    block_title = sv2thing.name[cspec.svs[0]]
    block_description = sv2thing.description[cspec.svs[0]]
  else:
    is_ranking_across_places = False
    block_title = attr.get('title', '')
    block_description = ''

  _, column = builder.new_chart(cspec.attr)
  builder.block.title = _decorate_block_title(
      title=block_title,
      do_pc=False,
      chart_origin=attr['class'],
      growth_direction=attr['growth_direction'],
      growth_ranking_type=attr['growth_ranking_type'])
  builder.block.description = block_description

  for sv_dcid in cspec.svs:
    for place in cspec.places:
      if is_ranking_across_places:
        chart_title = place.name
      else:
        chart_title = _decorate_chart_title(title=sv2thing.name[sv_dcid],
                                            place=place)

      sv_key = sv_dcid
      tile = Tile(type=Tile.TileType.LINE,
                  title=chart_title,
                  stat_var_key=[sv_key])
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                              name=sv2thing.name[sv_dcid],
                                              unit=sv2thing.unit[sv_dcid])

      if is_ranking_across_places:
        tile.place_dcid_override = place.dcid
      column.tiles.append(tile)

  return stat_var_spec_map


def _single_place_single_var_timeline_block(column, place, sv_dcid, sv2thing,
                                            attr):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  title = _decorate_chart_title(title=sv2thing.name[sv_dcid], place=place)

  # Line chart for the stat var
  sv_key = sv_dcid
  tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[sv_key])
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                          name=sv2thing.name[sv_dcid],
                                          unit=sv2thing.unit[sv_dcid])
  column.tiles.append(tile)

  # Line chart for the stat var per capita
  if attr['include_percapita'] and utils.is_percapita_relevant(sv_dcid):
    title = _decorate_chart_title(title=sv2thing.name[sv_dcid],
                                  place=place,
                                  do_pc=True)
    sv_key = sv_dcid + '_pc'
    tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[sv_key])
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                            name=sv2thing.name[sv_dcid],
                                            denom="Count_Person")
    column.tiles.append(tile)
  return stat_var_spec_map


def _single_place_multiple_var_timeline_block(column, place, svs, sv2thing,
                                              attr):
  """A column with two chart, all stat vars and per capita"""
  stat_var_spec_map = {}

  orig_title = attr['title'] if attr[
      'title'] else "Compared with Other Variables"
  title = _decorate_chart_title(title=orig_title, place=place)

  # Line chart for the stat var
  tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[])
  for sv in svs:
    sv_key = sv
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                            name=sv2thing.name[sv],
                                            unit=sv2thing.unit[sv])
  column.tiles.append(tile)

  # Line chart for the stat var per capita
  svs_pc = list(filter(lambda x: utils.is_percapita_relevant(x), svs))
  if attr['include_percapita'] and len(svs_pc) > 0:
    title = _decorate_chart_title(title=orig_title, place=place, do_pc=True)
    tile = Tile(type=Tile.TileType.LINE, title=title)
    for sv in svs_pc:
      sv_key = sv + '_pc'
      tile.stat_var_key.append(sv_key)
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                              name=sv2thing.name[sv],
                                              denom="Count_Person")
    column.tiles.append(tile)

  return stat_var_spec_map


def _multiple_place_bar_block(column, places: List[Place], svs: List[str],
                              sv2thing, attr):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  if attr['title']:
    # This happens in the case of Topics
    orig_title = attr['title']
  elif len(svs) > 1:
    # This suggests we are comparing against SV peers from SV extension
    orig_title = 'Compared with Other Variables'
  else:
    # This is the case of multiple places for a single SV
    orig_title = sv2thing.name[svs[0]]

  title_suffix = ''
  if attr.get('title_suffix', None):
    title_suffix = attr['title_suffix']

  if len(places) == 1:
    title = _decorate_chart_title(title=orig_title,
                                  place=places[0],
                                  add_date=True,
                                  title_suffix=title_suffix)
    pc_title = _decorate_chart_title(title=orig_title,
                                     place=places[0],
                                     add_date=True,
                                     do_pc=True,
                                     title_suffix=title_suffix)
  else:
    title = _decorate_chart_title(title=orig_title,
                                  add_date=True,
                                  place=None,
                                  title_suffix=title_suffix)
    pc_title = _decorate_chart_title(title=orig_title,
                                     add_date=True,
                                     place=None,
                                     do_pc=True,
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

  column.tiles.append(tile)
  # Per Capita
  svs_pc = list(filter(lambda x: utils.is_percapita_relevant(x), svs))
  if attr['include_percapita'] and len(svs_pc) > 0:
    tile = Tile(type=Tile.TileType.BAR,
                title=pc_title,
                comparison_places=[x.dcid for x in places])
    for sv in svs_pc:
      sv_key = sv + "_multiple_place_bar_block_pc"
      tile.stat_var_key.append(sv_key)
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                              denom="Count_Person",
                                              name=sv2thing.name[sv])

    column.tiles.append(tile)
  return stat_var_spec_map


def _map_chart_block(column, place: Place, pri_sv: str, sv2thing, attr):
  svs_map = _map_chart_block_nopc(column, place, pri_sv, sv2thing, attr)
  if attr['include_percapita'] and utils.is_percapita_relevant(pri_sv):
    svs_map.update(_map_chart_block_pc(column, place, pri_sv, sv2thing, attr))
  return svs_map


def _map_chart_block_nopc(column, place: Place, pri_sv: str, sv2thing: Dict,
                          attr: Dict):
  # The main tile
  tile = column.tiles.add()
  tile.stat_var_key.append(pri_sv)
  tile.type = Tile.TileType.MAP
  tile.title = _decorate_chart_title(title=sv2thing.name[pri_sv],
                                     place=place,
                                     add_date=True,
                                     do_pc=False,
                                     child_type=attr.get('place_type', ''))

  stat_var_spec_map = {}
  stat_var_spec_map[pri_sv] = StatVarSpec(stat_var=pri_sv,
                                          name=sv2thing.name[pri_sv],
                                          unit=sv2thing.unit[pri_sv])
  return stat_var_spec_map


def _map_chart_block_pc(column, place: Place, pri_sv: str, sv2thing: Dict,
                        attr: Dict):
  tile = column.tiles.add()
  sv_key = pri_sv + "_pc"
  tile.stat_var_key.append(sv_key)
  tile.type = Tile.TileType.MAP
  tile.title = _decorate_chart_title(title=sv2thing.name[pri_sv],
                                     place=place,
                                     do_pc=True,
                                     add_date=True,
                                     child_type=attr.get('place_type', ''))

  stat_var_spec_map = {}
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=pri_sv,
                                          denom="Count_Person",
                                          name=sv2thing.name[pri_sv])
  return stat_var_spec_map


def _set_ranking_tile_spec(ranking_types: List[RankingType], pri_sv: str,
                           ranking_tile_spec: RankingTileSpec):
  ranking_tile_spec.ranking_count = 10
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
    elif RankingType.LOW in ranking_types:
      ranking_tile_spec.show_lowest = True
    elif RankingType.EXTREME in ranking_types:
      if _does_extreme_mean_low(pri_sv):
        ranking_tile_spec.show_lowest = True
      else:
        ranking_tile_spec.show_highest = True


def _does_extreme_mean_low(sv: str) -> bool:
  _MIN_SV_PATTERNS = ['ProjectedMin', 'Min_Temperature']
  for p in _MIN_SV_PATTERNS:
    if p in sv:
      return True
  return False


def _ranking_chart_block_climate_extremes(builder, pri_place: Place,
                                          pri_svs: List[str], sv2thing: Dict,
                                          attr: Dict):
  footnotes = []
  stat_var_spec_map = {}

  # Add the main ranking tile
  ranking_block, ranking_column = builder.new_chart(attr)
  ranking_tile = ranking_column.tiles.add()
  ranking_tile.type = Tile.TileType.RANKING

  for _, sv in enumerate(pri_svs):
    _set_ranking_tile_spec(attr['ranking_types'], sv,
                           ranking_tile.ranking_tile_spec)
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
        _map_chart_block_nopc(map_column, pri_place, sv, sv2thing, attr))
    map_column.tiles[0].title = sv2thing.name[
        sv]  # override decorated title (too long).

  map_block.title = ''
  map_block.description = ''
  map_block.footnote = '\n\n'.join(footnotes)

  return stat_var_spec_map


def _ranking_chart_block_nopc(column, pri_place: Place, pri_sv: str,
                              sv2thing: Dict, attr: Dict):
  # The main tile
  tile = column.tiles.add()
  tile.stat_var_key.append(pri_sv)
  tile.type = Tile.TileType.RANKING
  _set_ranking_tile_spec(attr['ranking_types'], pri_sv, tile.ranking_tile_spec)
  tile.title = _decorate_chart_title(title=sv2thing.name[pri_sv],
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
        _map_chart_block_nopc(column, pri_place, pri_sv, sv2thing, attr))

  return stat_var_spec_map


def _ranking_chart_block_pc(column, pri_place: Place, pri_sv: str,
                            sv2thing: Dict, attr: Dict):
  # The per capita tile
  tile = column.tiles.add()
  sv_key = pri_sv + "_pc"
  tile.stat_var_key.append(sv_key)
  tile.type = Tile.TileType.RANKING
  _set_ranking_tile_spec(attr['ranking_types'], pri_sv, tile.ranking_tile_spec)
  tile.title = _decorate_chart_title(title=sv2thing.name[pri_sv],
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
                           tile.ranking_tile_spec)
    sv_title = sv2thing.name[pri_sv] + " " + name_suffix
    tile.title = _decorate_chart_title(title=sv_title,
                                       place=pri_place,
                                       add_date=True,
                                       do_pc=False,
                                       child_type=attr.get('place_type', ''))

    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=pri_sv,
                                            denom=denom_sv,
                                            name=sv_title)

  # TODO: Maybe add ADDITIONAL_DENOMINATOR_VARS to map too
  if not 'skip_map_for_ranking' in attr:
    # Also add a map chart.
    stat_var_spec_map.update(
        _map_chart_block_pc(column, pri_place, pri_sv, sv2thing, attr))

  return stat_var_spec_map


def _scatter_chart_block(column, pri_place: Place, sv_pair: List[str],
                         sv2thing: Dict, attr: Dict):
  assert len(sv_pair) == 2

  sv_names = [sv2thing.name[sv_pair[0]], sv2thing.name[sv_pair[1]]]
  sv_units = [sv2thing.unit[sv_pair[0]], sv2thing.unit[sv_pair[1]]]
  sv_key_pair = [sv_pair[0] + '_scatter', sv_pair[1] + '_scatter']

  change_to_pc = [False, False]
  is_sv_pc = [
      _is_sv_percapita(sv_names[0], sv_pair[0]),
      _is_sv_percapita(sv_names[1], sv_pair[1])
  ]
  if is_sv_pc[0]:
    if not is_sv_pc[1]:
      change_to_pc[1] = True
      sv_names[1] += " Per Capita"
  if is_sv_pc[1]:
    if not is_sv_pc[0]:
      change_to_pc[0] = True
      sv_names[0] += " Per Capita"

  stat_var_spec_map = {}
  for i in range(2):
    if change_to_pc[i]:
      stat_var_spec_map[sv_key_pair[i]] = StatVarSpec(stat_var=sv_pair[i],
                                                      name=sv_names[i],
                                                      denom='Count_Person',
                                                      unit='%')
    else:
      stat_var_spec_map[sv_key_pair[i]] = StatVarSpec(stat_var=sv_pair[i],
                                                      name=sv_names[i],
                                                      unit=sv_units[i])

  # add a scatter config
  tile = column.tiles.add()
  tile.stat_var_key.extend(sv_key_pair)
  tile.type = Tile.TileType.SCATTER
  tile.title = _decorate_chart_title(
      title=f"{sv_names[0]} (${{yDate}}) vs. {sv_names[1]} (${{xDate}})",
      place=pri_place,
      do_pc=False,
      child_type=attr.get('place_type', ''))
  tile.scatter_tile_spec.highlight_top_right = True

  return stat_var_spec_map


def _place_overview_block(column):
  tile = column.tiles.add()
  tile.type = Tile.TileType.PLACE_OVERVIEW


def _event_chart_block(metadata, block, column, place: Place,
                       event_type: EventType, attr, event_config):

  # Map EventType to config key.
  event_id = constants.EVENT_TYPE_TO_CONFIG_KEY[event_type]

  if event_id in event_config.metadata.event_type_spec:
    metadata.event_type_spec[event_id].CopyFrom(
        event_config.metadata.event_type_spec[event_id])
  else:
    logging.error('ID not found in event_type_spec: %s', event_id)
    return

  if not place.place_type in metadata.contained_place_types:
    metadata.contained_place_types[place.place_type] = \
      utils.get_default_child_place_type(place).value

  event_name = metadata.event_type_spec[event_id].name
  if event_type in constants.EVENT_TYPE_TO_DISPLAY_NAME:
    event_name = constants.EVENT_TYPE_TO_DISPLAY_NAME[event_type]
  event_title = _decorate_chart_title(title=event_name, place=place)
  block.title = event_title
  block.type = Block.DISASTER_EVENT

  if (RankingType.HIGH in attr['ranking_types'] or
      RankingType.EXTREME in attr['ranking_types']):
    tile = column.tiles.add()
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
      tile.title = _decorate_chart_title(title=tile.title, place=place)
    tile = block.columns.add().tiles.add()
  else:
    tile = column.tiles.add()

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


def _is_map_or_ranking_compatible(cspec: ChartSpec) -> bool:
  if len(cspec.places) > 1:
    logging.error('Incompatible MAP/RANKING: too-many-places ', cspec)
    return False
  if 'place_type' not in cspec.attr or not cspec.attr['place_type']:
    logging.error('Incompatible MAP/RANKING: missing-place-type', cspec)
    return False
  return True


def _decorate_block_title(title: str,
                          do_pc: bool = False,
                          chart_origin: ChartOriginType = None,
                          growth_direction: TimeDeltaType = None,
                          growth_ranking_type: str = '') -> str:
  if growth_direction != None:
    if growth_direction == TimeDeltaType.INCREASE:
      prefix = 'Increase'
    else:
      prefix = 'Decrease'
    suffix = 'over time '
    if growth_ranking_type == 'abs':
      suffix += '(Absolute change)'
    elif growth_ranking_type == 'pct':
      suffix += '(Percent change)'
    elif growth_ranking_type == 'pc':
      suffix += '(Per Capita change)'
    if title:
      title = ' '.join([prefix, 'in', title, suffix])
    else:
      title = prefix + ' ' + suffix

  if not title:
    return ''

  if do_pc:
    title = 'Per Capita ' + title

  if chart_origin == ChartOriginType.SECONDARY_CHART:
    title = 'Related: ' + title

  return title


def _decorate_chart_title(title: str,
                          place: Place,
                          add_date: bool = False,
                          do_pc: bool = False,
                          child_type: str = '',
                          title_suffix: str = '') -> str:
  if not title:
    return ''

  # Apply in order: place or place+containment, per-capita, related prefix
  if place and place.name:
    if place.dcid == 'Earth':
      title = title + ' in the World'
    else:
      if child_type:
        title = title + ' in ' + utils.pluralize_place_type(
            child_type) + ' of ' + place.name
      else:
        title = title + ' in ' + place.name

  if do_pc:
    title = 'Per Capita ' + title

  if add_date:
    title = title + ' (${date})'

  if title_suffix:
    title += ' - ' + title_suffix

  return title


def _is_sv_percapita(sv_name: str, sv_dcid: str) -> bool:
  # Check both names and dcids because per capita indicating word may be in one
  # or the other.
  for per_capita_indicator in ["Percent", "Prevalence"]:
    for sv_string in [sv_name, sv_dcid]:
      if per_capita_indicator in sv_string:
        return True
  return False
