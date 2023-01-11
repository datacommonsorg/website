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

from typing import List, Dict

from config import subject_page_pb2
from lib.nl_data_spec import DataSpec
from lib.nl_detection import ClassificationType, Detection, Place, RankingType
from lib import nl_variable, nl_topic
from services import datacommons as dc
import json
import os

PLACE_TYPE_TO_PLURALS = {
    "place": "places",
    "continent": "continents",
    "country": "countries",
    "state": "states",
    "province": "provinces",
    "county": "counties",
    "city": "cities",
    "censuszipcodetabulationarea": "census zip code tabulation areas",
    "town": "towns",
    "village": "villages",
    "censusdivision": "census divisions",
    "borough": "boroughs",
    "eurostatnuts1": "Eurostat NUTS 1 places",
    "eurostatnuts2": "Eurostat NUTS 2 places",
    "eurostatnuts3": "Eurostat NUTS 3 places",
    "administrativearea1": "administrative area 1 places",
    "administrativearea2": "administrative area 2 places",
    "administrativearea3": "administrative area 3 places",
    "administrativearea4": "administrative area 4 places",
    "administrativearea5": "administrative area 5 places",
}

CHART_TITLE_CONFIG_RELATIVE_PATH = "../config/nl_page/chart_titles_by_sv.json"


def pluralize_place_type(place_type: str) -> str:
  return PLACE_TYPE_TO_PLURALS.get(place_type.lower(),
                                   PLACE_TYPE_TO_PLURALS["place"])


def get_sv_name(svs):
  sv2name_raw = dc.property_values(svs, 'name')
  uncurated_names = {
      sv: names[0] if names else sv for sv, names in sv2name_raw.items()
  }
  basepath = os.path.dirname(__file__)
  title_config_path = os.path.abspath(
      os.path.join(basepath, CHART_TITLE_CONFIG_RELATIVE_PATH))
  title_by_sv_dcid = {}
  with open(title_config_path) as f:
    title_by_sv_dcid = json.load(f)
  sv_name_map = {}
  # If a curated name is found return that,
  # Else return the name property for SV.
  for sv in svs:
    if sv in title_by_sv_dcid:
      sv_name_map[sv] = title_by_sv_dcid[sv]
    else:
      sv_name_map[sv] = uncurated_names[sv]

  return sv_name_map


def _single_place_single_var_timeline_block(sv_dcid, sv2name):
  """A column with two charts, main stat var and per capita"""
  block = subject_page_pb2.Block(title=sv2name[sv_dcid],
                                 columns=[subject_page_pb2.Block.Column()])
  stat_var_spec_map = {}
  # Line chart for the stat var
  sv_key = sv_dcid
  tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.LINE,
                               title="Total",
                               stat_var_key=[sv_key])
  stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(
      stat_var=sv_dcid, name=sv2name[sv_dcid])
  block.columns[0].tiles.append(tile)
  # Line chart for the stat var per capita
  sv_key = sv_dcid + '_pc'
  tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.LINE,
                               title="Per Capita",
                               stat_var_key=[sv_key])
  stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(
      stat_var=sv_dcid, name=sv2name[sv_dcid], denom="Count_Person")
  block.columns[0].tiles.append(tile)
  return block, stat_var_spec_map


def _single_place_multiple_var_timeline_block(svs, sv2name):
  """A column with two chart, all stat vars and per capita"""
  block = subject_page_pb2.Block(columns=[subject_page_pb2.Block.Column()])
  stat_var_spec_map = {}
  # Line chart for the stat var
  tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.LINE,
                               title="Total",
                               stat_var_key=[])
  for sv in svs:
    sv_key = sv
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(stat_var=sv,
                                                             name=sv2name[sv])
  block.columns[0].tiles.append(tile)
  # Line chart for the stat var per capita
  tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.LINE,
                               title="Per Capita")
  for sv in svs:
    sv_key = sv + '_pc'
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(
        stat_var=sv, name=sv2name[sv], denom="Count_Person")
  block.columns[0].tiles.append(tile)

  return block, stat_var_spec_map


def _multiple_place_bar_block(places: List[Place], svs: List[str], sv2name):
  """A column with two charts, main stat var and per capita"""
  block = subject_page_pb2.Block(title="")
  column = block.columns.add()
  stat_var_spec_map = {}
  # Total
  tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.BAR,
                               title="Total",
                               comparison_places=[x.dcid for x in places])
  for sv in svs:
    sv_key = sv + "_multiple_place_bar_block"
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(stat_var=sv,
                                                             name=sv2name[sv])

  column.tiles.append(tile)
  # Per Capita
  tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.BAR,
                               title="Per Capita",
                               comparison_places=[x.dcid for x in places])
  for sv in svs:
    sv_key = sv + "_multiple_place_bar_block_pc"
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(
        stat_var=sv, denom="Count_Person", name=sv2name[sv])

  column.tiles.append(tile)
  return block, stat_var_spec_map


def _topic_sv_blocks(category: subject_page_pb2.Category, topic_svs: List[str],
                     extended_sv_map: Dict[str,
                                           List[str]], sv2name, sv_exists_list):
  """Fill in category if there is a topic."""
  main_block = category.blocks.add()
  column = main_block.columns.add()
  for sv in topic_svs:
    if 'dc/svpg/' in sv:
      sub_svs = extended_sv_map[sv]
      if not sub_svs:
        continue
      sub_svs_exist = filter(lambda x: x in sv_exists_list, sub_svs)
      if not sub_svs_exist:
        continue
      # add a block for each peer group
      block = category.blocks.add()
      column = block.columns.add()
      for i, sub_sv in enumerate(sub_svs_exist):
        # split up into several line charts
        if i % 5 == 0:
          tile = column.tiles.add()
          tile.type = subject_page_pb2.Tile.TileType.LINE
          tile.title = nl_topic.svpg_name(sv)
        tile.stat_var_key.append(sub_sv)
        category.stat_var_spec[sub_sv].stat_var = sub_sv
        category.stat_var_spec[sub_sv].name = sv2name[sub_sv]
    elif sv in sv_exists_list:
      # add to main line chart
      tile = column.tiles.add()
      tile.type = subject_page_pb2.Tile.TileType.LINE
      tile.title = sv2name[sv]
      tile.stat_var_key.append(sv)
      category.stat_var_spec[sv].stat_var = sv
      category.stat_var_spec[sv].name = sv2name[sv]


def build_page_config(detection: Detection, data_spec: DataSpec):

  main_place_spec = data_spec.main_place_spec
  contained_place_spec = data_spec.contained_place_spec

  # Init
  page_config = subject_page_pb2.SubjectPageConfig()
  # Set metadata
  page_config.metadata.place_dcid.append(main_place_spec.place)
  page_config.metadata.contained_place_types[
      main_place_spec.type] = contained_place_spec.contained_place_type

  # Set category data
  category = page_config.categories.add()
  classifier = detection.classifications[0]
  classificationType = classifier.type

  primary_sv = data_spec.primary_sv
  primary_sv_siblings = data_spec.primary_sv_siblings
  context_place = data_spec.context_place

  if data_spec.topic_svs and data_spec.main_place_spec.place:
    # Special boost for topics
    all_svs = data_spec.topic_svs.copy()
    for _, v in nl_topic.get_topic_peers(data_spec.topic_svs).items():
      all_svs += v
    sv2name = get_sv_name(all_svs)
    _topic_sv_blocks(category, data_spec.topic_svs, data_spec.extended_sv_map,
                     sv2name, data_spec.main_place_spec.svs)
    return page_config

  if not primary_sv:
    if main_place_spec.place:
      block = category.blocks.add()
      block.title = main_place_spec.name
      column = block.columns.add()
      tile = column.tiles.add()
      tile.type = subject_page_pb2.Tile.TileType.PLACE_OVERVIEW
    return page_config

  all_svs = [data_spec.primary_sv] + data_spec.primary_sv_siblings
  if contained_place_spec.svs:
    all_svs += contained_place_spec.svs
  sv2name = get_sv_name(all_svs)

  primary_sv = data_spec.primary_sv
  primary_sv_siblings = data_spec.primary_sv_siblings

  if classificationType in [
      ClassificationType.SIMPLE, ClassificationType.OTHER
  ]:
    if data_spec.use_context_sv:
      # Only place is asked, draw comparison between two places
      block, stat_var_spec_map = _multiple_place_bar_block(
          [context_place, detection.places_detected.main_place], [primary_sv],
          sv2name)
      category.blocks.append(block)
      for sv_key, spec in stat_var_spec_map.items():
        category.stat_var_spec[sv_key].CopyFrom(spec)
      # Draw for all stat vars
      block, stat_var_spec_map = _multiple_place_bar_block(
          [context_place, detection.places_detected.main_place],
          primary_sv_siblings, sv2name)
      category.blocks.append(block)
      for sv_key, spec in stat_var_spec_map.items():
        category.stat_var_spec[sv_key].CopyFrom(spec)
    else:
      # Query for place and sv, draw simple charts
      # The primary stat var
      block, stat_var_spec_map = _single_place_single_var_timeline_block(
          primary_sv, sv2name)
      category.blocks.append(block)
      for sv_key, spec in stat_var_spec_map.items():
        category.stat_var_spec[sv_key].CopyFrom(spec)

      # The siblings for the primary stat var
      if primary_sv_siblings:
        block, stat_var_spec_map = _single_place_multiple_var_timeline_block(
            primary_sv_siblings, sv2name)
        category.blocks.append(block)
        for sv_key, spec in stat_var_spec_map.items():
          category.stat_var_spec[sv_key].CopyFrom(spec)

  elif classificationType in [
      ClassificationType.RANKING, ClassificationType.CONTAINED_IN
  ]:
    if primary_sv in contained_place_spec.svs:
      block = category.blocks.add()
      block.title = "{} in {}".format(
          pluralize_place_type(
              contained_place_spec.contained_place_type).capitalize(),
          main_place_spec.name)
      column = block.columns.add()
      # The main tile
      tile = column.tiles.add()
      tile.stat_var_key.append(primary_sv)
      if classifier.type == ClassificationType.RANKING:
        tile.type = subject_page_pb2.Tile.TileType.RANKING
        if "CriminalActivities" in primary_sv:
          # first check if "best" or "worst"
          if RankingType.BEST in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_lowest = True
          elif RankingType.WORST in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_highest = True
          else:
            # otherwise, render normally
            if RankingType.HIGH in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_highest = True
            if RankingType.LOW in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_lowest = True
        else:
          if RankingType.HIGH in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_highest = True
          if RankingType.LOW in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_lowest = True

        tile.title = ''.join(
            [sv2name[primary_sv], ' in ', main_place_spec.name])
      else:
        tile.type = subject_page_pb2.Tile.TileType.MAP
        tile.title = sv2name[primary_sv] + ' (${date})'
      category.stat_var_spec[primary_sv].stat_var = primary_sv
      category.stat_var_spec[primary_sv].name = sv2name[primary_sv]

      # The per capita tile
      tile = column.tiles.add()
      sv_key = primary_sv + "_pc"
      tile.stat_var_key.append(sv_key)
      if classifier.type == ClassificationType.RANKING:
        tile.type = subject_page_pb2.Tile.TileType.RANKING
        if "CriminalActivities" in primary_sv:
          # first check if "best" or "worst"
          if RankingType.BEST in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_lowest = True
          elif RankingType.WORST in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_highest = True
          else:
            # otherwise, render normally
            if RankingType.HIGH in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_highest = True
            if RankingType.LOW in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_lowest = True
        else:
          if RankingType.HIGH in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_highest = True
          if RankingType.LOW in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_lowest = True

        tile.title = ''.join(
            ['Per Capita ', sv2name[primary_sv], ' in ', main_place_spec.name])
      else:
        tile.type = subject_page_pb2.Tile.TileType.MAP
        tile.title = "Per Capita " + sv2name[primary_sv] + ' (${date})'
      category.stat_var_spec[sv_key].stat_var = primary_sv
      category.stat_var_spec[sv_key].name = sv2name[primary_sv]
      category.stat_var_spec[sv_key].denom = "Count_Person"

  # # Main place
  # if spec.main.svs:
  #   block = category.blocks.add()
  #   block.title = spec.main.name
  #   column = block.columns.add()
  #   for sv in spec.main.svs:
  #     tile = column.tiles.add()
  #     tile.type = subject_page_pb2.Tile.TileType.LINE
  #     tile.title = sv2name[sv]
  #     tile.stat_var_key.append(sv)
  #     category.stat_var_spec[sv].stat_var = sv
  #     category.stat_var_spec[sv].name = sv2name[sv]

  # # Nearby place
  # if spec.nearby.sv2places:
  #   block = category.blocks.add()
  #   block.title = "{} near {}".format(
  #       pluralize_place_type(spec.main.type).capitalize(), spec.main.name)
  #   column = block.columns.add()
  #   for sv, places in spec.nearby.sv2places.items():
  #     tile = column.tiles.add()
  #     tile.type = subject_page_pb2.Tile.TileType.BAR
  #     tile.title = sv2name[sv]
  #     tile.comparison_places[:] = places
  #     tile.stat_var_key.append(sv)
  #     category.stat_var_spec[sv].stat_var = sv
  #     category.stat_var_spec[sv].name = sv2name[sv]

  # # Contained place
  return page_config
