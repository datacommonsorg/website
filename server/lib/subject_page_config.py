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
from typing import Dict, List

from flask import escape

from server.config import subject_page_pb2
import server.routes.api.place as place_api
import server.services.datacommons as dc

DEFAULT_PLACE_DCID = "Earth"
DEFAULT_PLACE_TYPE = "Planet"
EUROPE_DCID = "europe"
EUROPE_CONTAINED_PLACE_TYPES = {
    "Country": "EurostatNUTS1",
    "EurostatNUTS1": "EurostatNUTS2",
    "EurostatNUTS2": "EurostatNUTS3",
    "EurostatNUTS3": "EurostatNUTS3",
}


@dataclass
class PlaceMetadata:
  """Place metadata for subject pages."""
  place_name: str
  place_types: str
  parent_places: List[str]
  # If set, use this to override the contained_place_types map in config metadata.
  contained_place_types_override: Dict[str, str]


def get_all_variables(page_config):
  """Get all the variables from a page config"""
  result = []
  for category in page_config.categories:
    for _, spec in category.stat_var_spec.items():
      result.append(spec.stat_var)
      if spec.denom:
        result.append(spec.denom)
  return result


def is_tile_match(tile, stat_var_key, chart_type):
  """Check whether a tile matches given constraints.

  This is a util function to trim tile based on stat var and chart type.
  """
  if tile.type != chart_type:
    return False
  return stat_var_key in tile.stat_var_key
  # # When there are multiple stat vars for this tile, this will not be a match
  # # TODO: re-visit this condition based on the chart logic.
  # if len(tile.stat_var_key) != 1:
  #   return False
  # return tile.stat_var_key[0] == stat_var_key


def trim_config(page_config, variable, chart_type):
  """Trim the config based on given variable and chart_type"""
  for category in page_config.categories:
    for stat_var_key, spec in category.stat_var_spec.items():
      if spec.stat_var != variable:
        continue
      for block in category.blocks:
        for column in block.columns:
          # Remove matched tile
          tiles = [
              x for x in column.tiles
              if not is_tile_match(x, stat_var_key, chart_type)
          ]
          del column.tiles[:]
          column.tiles.extend(tiles)
        columns = [x for x in block.columns if len(x.tiles) > 0]
        del block.columns[:]
        block.columns.extend(columns)
      blocks = [x for x in category.blocks if len(x.columns) > 0]
      del category.blocks[:]
      category.blocks.extend(blocks)
  categories = [x for x in page_config.categories if len(x.blocks) > 0]
  del page_config.categories[:]
  page_config.categories.extend(categories)
  return page_config


# def remove_empty_charts(page_config, place_dcid):
#   """
#   Returns the page config stripped of charts with no data.
#   TODO: Add checks for child places, given the tile type.
#   """
#   all_stat_vars = get_all_variables(page_config)
#   if all_stat_vars:
#     stat_vars_existence = dc.observation_existence(all_stat_vars, [place_dcid])

#     for stat_var in stat_vars_existence['variable']:
#       if not stat_vars_existence['variable'][stat_var]['entity'][place_dcid]:
#         # This is for the main place, only remove the tile type for single place.
#         for tile_type in [
#             subject_page_pb2.Tile.TileType.HISTOGRAM,
#             subject_page_pb2.Tile.TileType.LINE,
#             subject_page_pb2.Tile.TileType.BAR,
#         ]:
#           page_config = trim_config(page_config, stat_var, tile_type)
#   return page_config

FILTER_TILE_TYPES = [
            subject_page_pb2.Tile.TileType.HIGHLIGHT,
            subject_page_pb2.Tile.TileType.RANKING,
            subject_page_pb2.Tile.TileType.HISTOGRAM,
            subject_page_pb2.Tile.TileType.MAP,
            subject_page_pb2.Tile.TileType.SCATTER,
            subject_page_pb2.Tile.TileType.BIVARIATE,
            subject_page_pb2.Tile.TileType.LINE,
            subject_page_pb2.Tile.TileType.BAR,
]

def exist_keys_category(place_dcid, category, stat_vars_existence):
  print(">>>>>>>>>>>>>>>>>>>>>>>>>>>")
  print(stat_vars_existence)
  exist_keys = {}
  for stat_var_key, spec in category.stat_var_spec.items():
    stat_var = spec.stat_var
    print(stat_var)
    sv_exist = stat_vars_existence['variable'][stat_var]['entity'][place_dcid]
    if spec.denom:
      print(stat_var)
      denom_exist = stat_vars_existence['variable'][spec.denom]['entity'][place_dcid]
      exist_keys[stat_var_key] = sv_exist and denom_exist
    else:
      exist_keys[stat_var_key] = sv_exist
  print(exist_keys)
  return exist_keys


def remove_empty_charts(page_config, place_dcid):
  all_stat_vars = get_all_variables(page_config)
  if not all_stat_vars:
    return page_config

  stat_vars_existence = dc.observation_existence(all_stat_vars, [place_dcid])
  print(">>>>>>>>>>>>>>>>>>>>>>>>>>>")
  print(stat_vars_existence)

  """
  - each cateogry
    - each block, column
      - each tile
        - clear stat var if no data
        - if no more stat vars, remove tile
    - filter out stat var keys
  """
  for category in page_config.categories:
    exist_keys = exist_keys_category(place_dcid, category, stat_vars_existence)
    print("exist keys")
    print(exist_keys)

    for block in category.blocks:
      for column in block.columns:
        new_tiles = []
        for t  in column.tiles:
          if not t.type in FILTER_TILE_TYPES:
            new_tiles.append(t)
            continue
          filtered_keys = [k for k in t.stat_var_key if exist_keys[k]]
          print(filtered_keys)
          if len(filtered_keys):
            del t.stat_var_key[:]
            t.stat_var_key.extend(filtered_keys)
            new_tiles.append(t)
        # if len(new_tiles):
        print("tiles:")
        print(new_tiles)
        del column.tiles[:]
        column.tiles.extend(new_tiles)
      columns = [x for x in block.columns if len(x.tiles) > 0]
      print("columns:")
      print(columns)
      del block.columns[:]
      block.columns.extend(columns)
    blocks = [x for x in category.blocks if len(x.columns) > 0]
    print("blocks:")
    print(blocks)
    del category.blocks[:]
    category.blocks.extend(blocks)
    # category.stat_var_spec.clear()
    for key, exists in exist_keys.items():
      if not exists:
        del category.stat_var_spec[key]
      # print(spec)
      # category.stat_var_spec[key].CopyFrom(spec)
    # category.stat_var_spec["kept_0"] = { "stat_var": "Area_fireEvent" }
    # category.stat_var_spec.update(exist_keys)
  categories = [x for x in page_config.categories if len(x.blocks) > 0]
  del page_config.categories[:]
  page_config.categories.extend(categories)
  return page_config

  # for category in page_config.categories:
  #   for stat_var_key, spec in category.stat_var_spec.items():
  #     stat_var = spec.stat_var
  #     if not stat_vars_existence['variable'][stat_var]['entity'][place_dcid]:
  #       page_config = trim_config(page_config, stat_var, FILTER_TILE_TYPES)
  # #     # No data for stat var - remove tiles
  #     for block in category.blocks:
  #       for column in block.columns:
  #         # Remove matched tile
  #         tiles = []
  #         for t in column.tiles:
  #           if not t.type in FILTER_TILE_TYPES:
  #             tiles.append(t)
  #             continue
  #           if stat_var_key in t.stat_var_key:
  #             new_keys = [k for k in t.stat_var_key if not t.stat_var_key == stat_var_key]
  #             del t.stat_var_key[:]
  #             t.stat_var_key.extend(new_keys)
  #             if len(t.stat_var_key) > 0:
  #               tiles.append(t)
  #         # tiles = [
  #         #     x for x in column.tiles
  #         #     if not is_tile_match(x, stat_var_key, chart_type)
  #         # ]
  #         del column.tiles[:]
  #         column.tiles.extend(tiles)
  #       columns = [x for x in block.columns if len(x.tiles) > 0]
  #       del block.columns[:]
  #       block.columns.extend(columns)
  #     blocks = [x for x in category.blocks if len(x.columns) > 0]
  #     del category.blocks[:]
  #     category.blocks.extend(blocks)
  # categories = [x for x in page_config.categories if len(x.blocks) > 0]
  # del page_config.categories[:]
  # page_config.categories.extend(categories)
  # return page_config


def place_metadata(place_dcid) -> PlaceMetadata:
  """
  Returns place metadata needed to render a subject page config for a given dcid.
  """
  place_types = [DEFAULT_PLACE_TYPE]
  parent_places = []
  if place_dcid != DEFAULT_PLACE_DCID:
    place_types = dc.property_values([place_dcid], 'typeOf')[place_dcid]
    if not place_types:
      place_types = ["Place"]
    parent_places = place_api.parent_places(place_dcid).get(place_dcid, [])
  place_name = place_api.get_i18n_name([place_dcid
                                       ]).get(place_dcid, escape(place_dcid))

  # If this is a European place, update the contained_place_types in the page
  # metadata to use a custom dict instead.
  # TODO: Find a better way to handle this
  parent_dcids = map(lambda place: place.get("dcid", ""), parent_places)
  contained_place_types_override = None
  if EUROPE_DCID in parent_dcids:
    contained_place_types_override = EUROPE_CONTAINED_PLACE_TYPES

  return PlaceMetadata(place_name, place_types, parent_places,
                       contained_place_types_override)
