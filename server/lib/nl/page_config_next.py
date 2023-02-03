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

import logging
import random
from typing import Dict, List

from config.subject_page_pb2 import Block
from config.subject_page_pb2 import RankingTileSpec
from config.subject_page_pb2 import StatVarSpec
from config.subject_page_pb2 import SubjectPageConfig
from config.subject_page_pb2 import Tile
from lib.nl import topic
from lib.nl import utils
from lib.nl.detection import EventType
from lib.nl.detection import Place
from lib.nl.detection import RankingType
from lib.nl.utterance import ChartSpec
from lib.nl.utterance import ChartType
from lib.nl.utterance import Utterance
from lib.nl.detection import ContainedInClassificationAttributes

# NOTE: This relies on disaster config's event_type_spec IDs.
# TODO: Consider switching these strings to proto enums and use those directly.
_EVENT_TYPE_TO_CONFIG_KEY = {
    EventType.COLD: "cold",
    EventType.CYCLONE: "storm",
    EventType.DROUGHT: "drought",
    EventType.EARTHQUAKE: "earthquake",
    EventType.FIRE: "fire",
    EventType.FLOOD: "flood",
    EventType.HEAT: "heat",
    EventType.WETBULB: "wetbulb",
}

# Override the names from configs.  These have plurals, etc.
_EVENT_TYPE_TO_DISPLAY_NAME = {
    EventType.COLD: "Extreme Cold Events",
    EventType.CYCLONE: "Storms",
    EventType.DROUGHT: "Droughts",
    EventType.EARTHQUAKE: "Earthquakes",
    EventType.FIRE: "Fires",
    EventType.FLOOD: "Floods",
    EventType.HEAT: "Exteme Heat Events",
    EventType.WETBULB: "High Wet-bulb Temperature Events",
}

# OVERVIEW_TEXT = "{place_name} is a {place_type} in {parent_place}. It has a population of {population} in {population_year}. Here is more information about {place}."
OVERVIEW_TEXT = "{place_name} is a {place_type}{parent_place}. Here is more information about {place_name}."

INFO_SYNONYMS = ["an overview of", "some information about", "some data about"]

def _strip_sv_name(sv_name: str) -> str:
  ret = sv_name.replace('Number of', '')
  ret = ret.split(' in the ')[-1]
  ret = ret.split(':')[-1]
  return ret


def _build_category_description(uttr: Utterance, sv2name) -> str:
  first_chart = uttr.rankedCharts[0]
  main_place = first_chart.places[0]
  if first_chart.chart_type == ChartType.PLACE_OVERVIEW:
    parent_places = utils.parent_place_names(main_place.dcid)
    parent_place = ' in ' + ', '.join(sorted(parent_places, reverse=True)) if parent_places else ''
    return OVERVIEW_TEXT.format(place_name=main_place.name, place_type=main_place.place_type.lower(), parent_place=parent_place)

  desc = ''
  if uttr.topic:
    desc = topic.get_topic_name(uttr.topic).lower()
    # if desc:
    #   desc = ' about the' + desc.lower()

  by = ''
  if len(uttr.classifications) and isinstance(uttr.classifications[0].attributes, ContainedInClassificationAttributes):
    place_type = uttr.classifications[0].attributes.contained_in_place_type
    by = ' by ' + place_type.value.lower()
    # if first_chart.description:
    #   return "Here are some {chart}{desc} of {place} by {by}.".format(
    #     chart=first_chart.description,
    #     bar=place_type, desc=desc.lower(), place=main_place.name, by=place_type.value.lower())

  if first_chart.description:
    if desc:
      return "Here are some {chart} about the {desc} of {place_name}{by}.".format(
        chart=first_chart.description, desc=desc.lower(), place_name=main_place.name, by=by)
    else:
      return "Here are some {chart} about \"{sv1}\" and more in {place_name}{by}.".format(
        chart=first_chart.description, sv1=sv2name[first_chart.svs[0]], place_name=main_place.name, by=by)
  elif desc:
    return "Here is {info_of} the {desc} in {place}, including \"{sv1}\" and more{by}.".format(
      info_of=random.choice(INFO_SYNONYMS),
      desc=desc.lower(), place=main_place.name, sv1=_strip_sv_name(sv2name[first_chart.svs[0]]), by=by)
  return "Here is {info_of} about \"{sv1}\" and more in {place_name}{by}.".format(
    info_of=random.choice(INFO_SYNONYMS),
    place_name=main_place.name, sv1=_strip_sv_name(sv2name[first_chart.svs[0]]), by=by)
    # category.description = "{place_name} is a {place_type}. Here is more information about {sv_name}.".format(
    #   place_name = main_place.name, place_type = main_place.place_type, sv_name = sv2name[first_chart.svs[0]])

#
# Given an Utterance, build the final Chart config proto.
#
def build_page_config(
    uttr: Utterance,
    event_config: SubjectPageConfig = None) -> SubjectPageConfig:
  # Init
  page_config = SubjectPageConfig()
  # Set metadata
  first_chart = uttr.rankedCharts[0]
  main_place = first_chart.places[0]
  page_config.metadata.place_dcid.append(main_place.dcid)
  if (first_chart.chart_type == ChartType.MAP_CHART or
      first_chart.chart_type == ChartType.RANKING_CHART or
      first_chart.chart_type == ChartType.SCATTER_CHART):
    page_config.metadata.contained_place_types[main_place.place_type] = \
      first_chart.attr['place_type']

  # Set category data
  category = page_config.categories.add()

  # Get names of all SVs
  all_svs = set()
  for cspec in uttr.rankedCharts:
    all_svs.update(cspec.svs)
  all_svs = list(all_svs)
  sv2name = utils.get_sv_name(all_svs)

  # Add a human answer to the query
  desc = _build_category_description(uttr, sv2name)
  if desc:
    category.description = desc

  # Build chart blocks
  prev_block_id = -1
  block = None
  column = None
  for cspec in uttr.rankedCharts:
    if not cspec.places:
      continue
    stat_var_spec_map = {}

    # Handle new block and column creation.
    block_id = cspec.attr['block_id']
    if block_id != prev_block_id:
      if block:
        category.blocks.append(block)
      block = Block()
      # if cspec.description:
      #   block.description = cspec.description
      column = block.columns.add()
      prev_block_id = block_id

    # Call per-chart handlers.

    if cspec.chart_type == ChartType.PLACE_OVERVIEW:
      place = cspec.places[0]
      block.title = place.name
      _place_overview_block(column)

    elif cspec.chart_type == ChartType.TIMELINE_CHART:
      if len(cspec.svs) > 1:
        stat_var_spec_map = _single_place_multiple_var_timeline_block(
            column, cspec.svs, sv2name, cspec.attr)
      else:
        stat_var_spec_map = _single_place_single_var_timeline_block(
            column, cspec.svs[0], sv2name, cspec.attr)

    elif cspec.chart_type == ChartType.BAR_CHART:
      stat_var_spec_map = _multiple_place_bar_block(column, cspec.places,
                                                    cspec.svs, sv2name,
                                                    cspec.attr)

    elif cspec.chart_type == ChartType.MAP_CHART:
      if not _is_map_or_ranking_compatible(cspec):
        continue
      stat_var_spec_map = _map_chart_block(column, cspec.places[0],
                                           cspec.svs[0], sv2name, cspec.attr)

    elif cspec.chart_type == ChartType.RANKING_CHART:
      # TODO: Ranking chart block title.
      if not _is_map_or_ranking_compatible(cspec):
        continue
      stat_var_spec_map = _ranking_chart_block(column, cspec.places[0],
                                               cspec.svs[0], sv2name,
                                               cspec.attr)

    elif cspec.chart_type == ChartType.SCATTER_CHART:
      stat_var_spec_map = _scatter_chart_block(column, cspec.places[0],
                                               cspec.svs, sv2name, cspec.attr)

    elif cspec.chart_type == ChartType.EVENT_CHART and event_config:
      _event_chart_block(page_config.metadata, block, column, cspec.places[0],
                         cspec.svs[0], cspec.attr, event_config)

    for sv_key, spec in stat_var_spec_map.items():
      category.stat_var_spec[sv_key].CopyFrom(spec)

  # If there is an active block, add it.
  if block:
    category.blocks.append(block)

  logging.info(page_config)
  return page_config


def _single_place_single_var_timeline_block(column, sv_dcid, sv2name, attr):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  # Line chart for the stat var
  sv_key = sv_dcid
  tile = Tile(type=Tile.TileType.LINE,
              title=sv2name[sv_dcid],
              stat_var_key=[sv_key])
  stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                          name=sv2name[sv_dcid])
  column.tiles.append(tile)

  # Line chart for the stat var per capita
  if attr['include_percapita'] and _should_add_percapita(sv_dcid):
    sv_key = sv_dcid + '_pc'
    tile = Tile(type=Tile.TileType.LINE,
                title=sv2name[sv_dcid] + " - Per Capita",
                stat_var_key=[sv_key])
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv_dcid,
                                            name=sv2name[sv_dcid],
                                            denom="Count_Person",
                                            scaling=100,
                                            unit="%")
    column.tiles.append(tile)
  return stat_var_spec_map


def _single_place_multiple_var_timeline_block(column, svs, sv2name, attr):
  """A column with two chart, all stat vars and per capita"""
  stat_var_spec_map = {}

  title = attr['title'] if attr['title'] else "Compare with Other Variables"

  # Line chart for the stat var
  tile = Tile(type=Tile.TileType.LINE, title=title, stat_var_key=[])
  for sv in svs:
    sv_key = sv
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv, name=sv2name[sv])
  column.tiles.append(tile)

  # Line chart for the stat var per capita
  svs_pc = list(filter(lambda x: _should_add_percapita(x), svs))
  if attr['include_percapita'] and len(svs_pc) > 0:
    tile = Tile(type=Tile.TileType.LINE, title=title + " - Per Capita")
    for sv in svs_pc:
      sv_key = sv + '_pc'
      tile.stat_var_key.append(sv_key)
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                              name=sv2name[sv],
                                              denom="Count_Person",
                                              scaling=100,
                                              unit="%")
    column.tiles.append(tile)

  return stat_var_spec_map


def _multiple_place_bar_block(column, places: List[Place], svs: List[str],
                              sv2name, attr):
  """A column with two charts, main stat var and per capita"""
  stat_var_spec_map = {}

  if attr['title']:
    # This happens in the case of Topics
    title = attr['title']
  elif len(svs) > 1:
    # This suggests we are comparing against SV peers from SV extension
    title = 'Compare with Other Variables'
  else:
    # This is the case of multiple places for a single SV
    title = 'Total'

  # Total
  tile = Tile(type=Tile.TileType.BAR,
              title=title,
              comparison_places=[x.dcid for x in places])
  for sv in svs:
    sv_key = sv + "_multiple_place_bar_block"
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv, name=sv2name[sv])

  column.tiles.append(tile)
  # Per Capita
  svs_pc = list(filter(lambda x: _should_add_percapita(x), svs))
  if attr['include_percapita'] and len(svs_pc) > 0:
    pc_title = title + ' - Per Capita' if title != 'Total' else 'Per Capita'
    tile = Tile(type=Tile.TileType.BAR,
                title=pc_title,
                comparison_places=[x.dcid for x in places])
    for sv in svs_pc:
      sv_key = sv + "_multiple_place_bar_block_pc"
      tile.stat_var_key.append(sv_key)
      stat_var_spec_map[sv_key] = StatVarSpec(stat_var=sv,
                                              denom="Count_Person",
                                              name=sv2name[sv],
                                              scaling=100,
                                              unit="%")

    column.tiles.append(tile)
  return stat_var_spec_map


def _map_chart_block(column, pri_place: Place, pri_sv: str, sv2name, attr):
  # The main tile
  tile = column.tiles.add()
  tile.stat_var_key.append(pri_sv)
  tile.type = Tile.TileType.MAP
  tile.title = sv2name[pri_sv]

  stat_var_spec_map = {}
  stat_var_spec_map[pri_sv] = StatVarSpec(stat_var=pri_sv, name=sv2name[pri_sv])

  # The per capita tile
  if attr['include_percapita'] and _should_add_percapita(pri_sv):
    tile = column.tiles.add()
    sv_key = pri_sv + "_pc"
    tile.stat_var_key.append(sv_key)
    tile.type = Tile.TileType.MAP
    tile.title = sv2name[pri_sv] + " - Per Capita"
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=pri_sv,
                                            denom="Count_Person",
                                            name=sv2name[pri_sv],
                                            scaling=100,
                                            unit="%")
  return stat_var_spec_map


def _set_ranking_tile_spec(ranking_types: List[RankingType], pri_sv: str,
                           ranking_tile_spec: RankingTileSpec):
  ranking_tile_spec.ranking_count = 10
  # TODO: Add more robust checks.
  if "CriminalActivities" in pri_sv:
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


def _ranking_chart_block(column, pri_place: Place, pri_sv: str, sv2name, attr):
  # The main tile
  tile = column.tiles.add()
  tile.stat_var_key.append(pri_sv)
  tile.type = Tile.TileType.RANKING
  _set_ranking_tile_spec(attr['ranking_types'], pri_sv, tile.ranking_tile_spec)
  tile.title = ''.join([sv2name[pri_sv], ' in ', pri_place.name])

  stat_var_spec_map = {}
  stat_var_spec_map[pri_sv] = StatVarSpec(stat_var=pri_sv, name=sv2name[pri_sv])

  # The per capita tile
  if attr['include_percapita'] and _should_add_percapita(pri_sv):
    tile = column.tiles.add()
    sv_key = pri_sv + "_pc"
    tile.stat_var_key.append(sv_key)
    tile.type = Tile.TileType.RANKING
    _set_ranking_tile_spec(attr['ranking_types'], pri_sv,
                           tile.ranking_tile_spec)
    tile.title = ''.join(
        ['Per Capita ', sv2name[pri_sv], ' in ', pri_place.name])
    stat_var_spec_map[sv_key] = StatVarSpec(stat_var=pri_sv,
                                            denom="Count_Person",
                                            name=sv2name[pri_sv],
                                            scaling=100,
                                            unit="%")
  return stat_var_spec_map


def _scatter_chart_block(column, pri_place: Place, sv_pair: List[str], sv2name,
                         attr):
  assert len(sv_pair) == 2

  sv_names = [sv2name[sv_pair[0]], sv2name[sv_pair[1]]]
  sv_key_pair = [sv_pair[0] + '_scatter', sv_pair[1] + '_scatter']

  change_to_pc = [False, False]
  if _is_sv_percapita(sv_names[0]):
    if not _is_sv_percapita(sv_names[1]):
      change_to_pc[1] = True
      sv_names[1] += " Per Capita"
  if _is_sv_percapita(sv_names[1]):
    if not _is_sv_percapita(sv_names[0]):
      change_to_pc[0] = True
      sv_names[0] += " Per Capita"

  stat_var_spec_map = {}
  for i in range(2):
    if change_to_pc[i]:
      stat_var_spec_map[sv_key_pair[i]] = StatVarSpec(stat_var=sv_pair[i],
                                                      name=sv_names[i],
                                                      denom='Count_Person',
                                                      unit='%',
                                                      scaling=100)
    else:
      stat_var_spec_map[sv_key_pair[i]] = StatVarSpec(stat_var=sv_pair[i],
                                                      name=sv_names[i])

  # add a scatter config
  tile = column.tiles.add()
  tile.stat_var_key.extend(sv_key_pair)
  tile.type = Tile.TileType.SCATTER
  tile.title = f"{sv_names[0]} vs. {sv_names[1]}"

  return stat_var_spec_map


def _place_overview_block(column):
  tile = column.tiles.add()
  tile.type = Tile.TileType.PLACE_OVERVIEW


def _event_chart_block(metadata, block, column, place: Place, event_key: str,
                       attr, event_config):

  # Map EventType to config key.
  event_type = EventType(int(event_key))
  event_id = _EVENT_TYPE_TO_CONFIG_KEY[event_type]

  if event_id == 'earthquake':
    eq_val = metadata.event_type_spec[event_id]
    eq_val.id = event_id
    eq_val.name = 'Earthquake'
    eq_val.event_type_dcids.append('EarthquakeEvent')
    eq_val.color = '#930000'
    sev_filter = eq_val.default_severity_filter
    sev_filter.prop = 'magnitude'
    sev_filter.display_name = 'Magnitude'
    sev_filter.upper_limit = 10
    sev_filter.lower_limit = 6
  elif event_id in event_config.metadata.event_type_spec:
    metadata.event_type_spec[event_id].CopyFrom(
        event_config.metadata.event_type_spec[event_id])
  else:
    logging.error('ID not found in event_type_spec: %s', event_id)
    return

  event_name = metadata.event_type_spec[event_id].name
  if event_type in _EVENT_TYPE_TO_DISPLAY_NAME:
    event_name = _EVENT_TYPE_TO_DISPLAY_NAME[event_type]
  block.title = event_name + ' in ' + place.name
  block.type = Block.DISASTER_EVENT

  tile = column.tiles.add()
  rank_high = RankingType.HIGH in attr['ranking_types']
  if rank_high:
    # TODO: Handle top event for earthquakes
    if not _maybe_copy_top_event(event_id, block, tile, event_config):
      tile.type = Tile.TOP_EVENT
      top_event = tile.top_event_tile_spec
      top_event.event_type_key = event_id
      top_event.display_prop.append('name')
      top_event.show_start_date = True
  else:
    tile.type = Tile.DISASTER_EVENT_MAP
    tile.disaster_event_map_tile_spec.event_type_keys.append(event_id)


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
  if len(cspec.svs) > 1:
    logging.error('Incompatible MAP/RANKING: too-many-svs', cspec)
    return False
  if 'place_type' not in cspec.attr or not cspec.attr['place_type']:
    logging.error('Incompatible MAP/RANKING: missing-place-type', cspec)
    return False
  return True


#
# Per-capita handling
#

_SV_PARTIAL_DCID_NO_PC = [
    'Temperature', 'Precipitation', "BarometricPressure", "CloudCover",
    "PrecipitableWater", "Rainfall", "Snowfall", "Visibility", "WindSpeed",
    "ConsecutiveDryDays", "Percent", 'Area_'
]


def _should_add_percapita(sv_dcid: str) -> bool:
  for skip_phrase in _SV_PARTIAL_DCID_NO_PC:
    if skip_phrase in sv_dcid:
      return False
  return True


def _is_sv_percapita(sv_name: str) -> bool:
  # Use names for these since some old prevalence dcid's do not use the new naming scheme.
  if "Percentage" in sv_name or "Prevalence" in sv_name:
    return True
  return False
