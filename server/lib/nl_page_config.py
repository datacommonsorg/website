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
import logging

from config import subject_page_pb2
from lib.nl_data_spec import DataSpec
from lib.nl_detection import ClassificationType, Detection, NLClassifier, RankingType
from services import datacommons as dc

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


def pluralize_place_type(place_type: str) -> str:
  return PLACE_TYPE_TO_PLURALS.get(place_type.lower(),
                                   PLACE_TYPE_TO_PLURALS["place"])


def get_sv_name(svs):
  sv2name_raw = dc.property_values(svs, 'name')
  return {sv: names[0] for sv, names in sv2name_raw.items()}


def _single_place_single_var_timeline_block(sv_dcid, sv2name):
  """A column with two charts, main stat var and per capita"""
  block = subject_page_pb2.Block()
  block.title = sv2name[sv_dcid]
  column = block.columns.add()
  stat_var_spec_map = {}
  # Line chart for the stat var
  tile = column.tiles.add()
  tile.type = subject_page_pb2.Tile.TileType.LINE
  tile.title = "Total"
  tile.stat_var_key.append(sv_dcid)
  sv_spec = subject_page_pb2.StatVarSpec()
  sv_spec.stat_var = sv_dcid
  sv_spec.name = sv2name[sv_dcid]
  stat_var_spec_map[sv_dcid] = sv_spec
  # Line chart for the stat var per capita
  tile = column.tiles.add()
  tile.type = subject_page_pb2.Tile.TileType.LINE
  tile.title = "Per Capita"
  sv_spec = subject_page_pb2.StatVarSpec()
  sv_key = sv_dcid + '_pc'
  tile.stat_var_key.append(sv_key)
  sv_spec.stat_var = sv_dcid
  sv_spec.name = sv2name[sv_dcid]
  sv_spec.denom = "Count_Person"
  stat_var_spec_map[sv_key] = sv_spec
  return block, stat_var_spec_map


def _single_place_multiple_var_timeline_block(svs, sv2name):
  """A column with two chart, all stat vars and per capita"""
  block = subject_page_pb2.Block()
  block.title = ""
  column = block.columns.add()
  stat_var_spec_map = {}
  # Line chart for the stat var
  tile = column.tiles.add()
  tile.type = subject_page_pb2.Tile.TileType.LINE
  tile.title = "Total"
  tile.stat_var_key.extend(svs)
  for sv in svs:
    sv_spec = subject_page_pb2.StatVarSpec()
    sv_spec.stat_var = sv
    sv_spec.name = sv2name[sv]
    stat_var_spec_map[sv] = sv_spec
  # Line chart for the stat var per capita
  tile = column.tiles.add()
  tile.type = subject_page_pb2.Tile.TileType.LINE
  tile.title = "Per Capita"
  for sv in svs:
    sv_spec = subject_page_pb2.StatVarSpec()
    sv_key = sv + '_pc'
    sv_spec.stat_var = sv
    sv_spec.name = sv2name[sv]
    sv_spec.denom = "Count_Person"
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = sv_spec
  return block, stat_var_spec_map


def build_page_config(detection: Detection, data_spec: DataSpec,
                      context_history):
  all_svs = data_spec.selected_svs + data_spec.expanded_svs
  for _, svs in data_spec.extended_sv_map.items():
    all_svs.extend(svs)
  sv2name = get_sv_name(all_svs)
  # Init
  page_config = subject_page_pb2.SubjectPageConfig()
  # Set metadata
  page_config.metadata.place_dcid.append(data_spec.main.place)
  page_config.metadata.contained_place_types[
      data_spec.main.type] = data_spec.contained.contained_place_type

  # Set category data
  category = page_config.categories.add()
  classifier = detection.classifications[0]
  classificationType = classifier.type

  # No stat vars found
  # TODO: use context to find previous stat vars
  if not data_spec.selected_svs:
    return page_config

  if classificationType in [
      ClassificationType.SIMPLE, ClassificationType.OTHER
  ]:
    # The primary stat var
    primary_sv = data_spec.selected_svs[0]
    block, stat_var_spec_map = _single_place_single_var_timeline_block(
        primary_sv, sv2name)
    category.blocks.append(block)
    for sv_key, spec in stat_var_spec_map.items():
      category.stat_var_spec[sv_key].CopyFrom(spec)

    # The siblings for the primary stat var
    usable_sibiling_svs = [
        x for x in data_spec.extended_sv_map[primary_sv]
        if x in data_spec.main.svs
    ]
    if usable_sibiling_svs:
      block, stat_var_spec_map = _single_place_multiple_var_timeline_block(
          usable_sibiling_svs, sv2name)
      category.blocks.append(block)
      for sv_key, spec in stat_var_spec_map.items():
        category.stat_var_spec[sv_key].CopyFrom(spec)

  elif classificationType in [
      ClassificationType.RANKING, ClassificationType.CONTAINED_IN
  ]:
    if data_spec.contained.svs:
      block = category.blocks.add()
      block.title = "{} in {}".format(
          pluralize_place_type(
              data_spec.contained.contained_place_type).capitalize(),
          data_spec.main.name)
      column = block.columns.add()
      tile = column
      for sv in data_spec.contained.svs:
        tile = column.tiles.add()
        tile.stat_var_key.append(sv)
        if classifier.type == ClassificationType.RANKING:
          tile.type = subject_page_pb2.Tile.TileType.RANKING
          if classifier.attributes.ranking_type == RankingType.HIGH:
            tile.ranking_tile_spec.show_highest = True
          if classifier.attributes.ranking_type == RankingType.LOW:
            tile.ranking_tile_spec.show_lowest = True

          tile.title = sv2name[sv] + ': rankings within ' + data_spec.main.name
        else:
          tile.type = subject_page_pb2.Tile.TileType.MAP
          tile.title = sv2name[sv] + ' (${date})'
        category.stat_var_spec[sv].stat_var = sv
        category.stat_var_spec[sv].name = sv2name[sv]
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
