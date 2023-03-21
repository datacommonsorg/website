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
from typing import Dict, List, Union

from flask import escape

from server.config import subject_page_pb2
import server.lib.nl.counters as nl_ctr
import server.lib.nl.utils as nl_utils
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

# Tile types to filter with existence checks.
PLACE_FILTER_TILE_TYPES = [
    subject_page_pb2.Tile.TileType.TYPE_NONE,
    subject_page_pb2.Tile.TileType.HIGHLIGHT,
    subject_page_pb2.Tile.TileType.RANKING,
    subject_page_pb2.Tile.TileType.LINE,
]
CHILD_FILTER_TILE_TYPES = [
    subject_page_pb2.Tile.TileType.MAP,
    subject_page_pb2.Tile.TileType.SCATTER,
    subject_page_pb2.Tile.TileType.BIVARIATE,
    subject_page_pb2.Tile.TileType.BAR,
]

SELF_PLACE_DCID_PLACEHOLDER = "self"


@dataclass
class PlaceMetadata:
  """Place metadata for subject pages."""
  place_dcid: str
  place_name: str
  place_types: List[str]
  parent_places: List[str]
  # If set, use this to override the contained_place_types map in config metadata.
  contained_place_types_override: Dict[str, str]
  # Corresponds to typescript type ChildPlacesByType
  child_places: Dict[str, List[Dict[str, Union[str, int]]]]


def get_all_variables(page_config):
  """Get all the variables from a page config"""
  result = []
  for category in page_config.categories:
    for _, spec in category.stat_var_spec.items():
      result.append(spec.stat_var)
      if spec.denom:
        result.append(spec.denom)
  return result


def _sv_places_exist(places, stat_var, stat_vars_existence, place_dcid):
  sv_entity = stat_vars_existence['variable'][stat_var]['entity']
  for p in places:
    if p == SELF_PLACE_DCID_PLACEHOLDER:
      p = place_dcid
    if not sv_entity[p]:
      return False
  return True


def _exist_keys_category(places: List[str], category, stat_vars_existence,
                         place_dcid):
  """
  Returns a dict of stat_var_spec key -> bool if data is available for the spec.
  """
  exist_keys = {}
  for stat_var_key, spec in category.stat_var_spec.items():
    sv_exist = _sv_places_exist(places, spec.stat_var, stat_vars_existence,
                                place_dcid)
    if spec.denom:
      denom_exist = _sv_places_exist(places, spec.denom, stat_vars_existence,
                                     place_dcid)
      exist_keys[stat_var_key] = sv_exist and denom_exist
    else:
      exist_keys[stat_var_key] = sv_exist
  return exist_keys


def _bar_comparison_places(page_config, place_dcid):
  places = set()
  for category in page_config.categories:
    for block in category.blocks:
      for column in block.columns:
        for t in column.tiles:
          if t.type == subject_page_pb2.Tile.TileType.BAR:
            for p in t.comparison_places:
              if p == SELF_PLACE_DCID_PLACEHOLDER:
                places.update(place_dcid)
              else:
                places.update(p)
  return list(places)


def remove_empty_charts(page_config, place_dcid, contained_place_type):
  """
  Returns the page config stripped of charts with no data.
  TODO: Add checks for child places, given the tile type.
  """
  ctr = nl_ctr.Counters()

  all_stat_vars = get_all_variables(page_config)
  if not all_stat_vars:
    return page_config

  # TODO: find child places only if there are maps, etc.
  sample_child_places = nl_utils.get_sample_child_places(
      place_dcid, contained_place_type, ctr)
  bar_comparison_places = _bar_comparison_places(page_config, place_dcid)
  all_places = sample_child_places + bar_comparison_places + [place_dcid]
  stat_vars_existence = dc.observation_existence(all_stat_vars, all_places)

  for category in page_config.categories:
    place_exist_keys = _exist_keys_category([place_dcid], category,
                                            stat_vars_existence, place_dcid)
    child_exist_keys = _exist_keys_category(sample_child_places, category,
                                            stat_vars_existence, place_dcid)

    for block in category.blocks:
      for column in block.columns:
        # Filter all tiles with no data
        new_tiles = []
        for t in column.tiles:
          filtered_keys = []
          if t.type == subject_page_pb2.Tile.TileType.BAR:
            if not t.comparison_places:
              filtered_keys = [k for k in t.stat_var_key if place_exist_keys[k]]
            else:
              # Should be the comparison places.
              comparison_exist_keys = _exist_keys_category(
                  t.comparison_places, category, stat_vars_existence,
                  place_dcid)
              filtered_keys = [
                  k for k in t.stat_var_key if comparison_exist_keys[k]
              ]
          elif t.type in PLACE_FILTER_TILE_TYPES:
            filtered_keys = [k for k in t.stat_var_key if place_exist_keys[k]]
          elif t.type in CHILD_FILTER_TILE_TYPES:
            filtered_keys = [k for k in t.stat_var_key if child_exist_keys[k]]
          else:
            new_tiles.append(t)
            continue
          if len(filtered_keys):
            del t.stat_var_key[:]
            t.stat_var_key.extend(filtered_keys)
            new_tiles.append(t)
        del column.tiles[:]
        column.tiles.extend(new_tiles)
      columns = [x for x in block.columns if len(x.tiles) > 0]
      del block.columns[:]
      block.columns.extend(columns)
    blocks = [x for x in category.blocks if len(x.columns) > 0]
    del category.blocks[:]
    category.blocks.extend(blocks)
    # Remove unused stat_var_spec from cateogry
    for key, exists in place_exist_keys.items():
      if not exists and not child_exist_keys[key]:
        del category.stat_var_spec[key]
  categories = [x for x in page_config.categories if len(x.blocks) > 0]
  del page_config.categories[:]
  page_config.categories.extend(categories)
  return page_config


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

  child_places = place_api.child_fetch(place_dcid)
  for place_type in child_places:
    child_places[place_type].sort(key=lambda x: x['pop'], reverse=True)
    child_places[place_type] = child_places[place_type][:place_api.
                                                        CHILD_PLACE_LIMIT]

  return PlaceMetadata(
      place_dcid=escape(place_dcid),
      place_name=place_name,
      place_types=place_types,
      parent_places=parent_places,
      child_places=child_places,
      contained_place_types_override=contained_place_types_override)
