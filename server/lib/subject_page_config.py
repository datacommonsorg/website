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

from markupsafe import escape

from server.config import subject_page_pb2
import server.lib.fetch as fetch
import server.lib.nl.common.counters as nl_ctr
import server.lib.nl.common.utils as nl_utils
import server.routes.shared_api.place as place_api

DEFAULT_PLACE_DCID = "Earth"
DEFAULT_PLACE_TYPE = "Planet"
OVERRIDE_CONTAINED_PLACE_TYPES = {
    "europe": {
        "Continent": "Country",
        "Country": "EurostatNUTS1",
        "EurostatNUTS1": "EurostatNUTS2",
        "EurostatNUTS2": "EurostatNUTS3",
        "EurostatNUTS3": "EurostatNUTS3",
    },
    "country/USA": {
        "Country": "State",
        "State": "County",
    },
    "country/IND": {
        "Country": "State",
        "State": "AdministrativeArea2",
    }
}

DEFAULT_CONTAINED_PLACE_TYPES = {
    "Planet": "Country",
    "Continent": "Country",
    "Country": "AdministrativeArea1",
    "AdministrativeArea1": "AdministrativeArea2",
    "AdministrativeArea2": "AdministrativeArea3",
}

# Tile types to filter with existence checks.
PLACE_FILTER_TILE_TYPES = [
    subject_page_pb2.Tile.TileType.TYPE_NONE,
    subject_page_pb2.Tile.TileType.HIGHLIGHT,
    subject_page_pb2.Tile.TileType.LINE,
]
CHILD_FILTER_TILE_TYPES = [
    subject_page_pb2.Tile.TileType.MAP,
    subject_page_pb2.Tile.TileType.SCATTER,
    subject_page_pb2.Tile.TileType.BIVARIATE,
    subject_page_pb2.Tile.TileType.BAR,
    subject_page_pb2.Tile.TileType.RANKING,
]
# Map of Tile type to the minimum number of stat var keys the tile should have.
TILE_MIN_SV_KEYS = {subject_page_pb2.Tile.TileType.SCATTER: 2}
# Placeholder allowed in config that should be interpreted as the main place dcid.
SELF_PLACE_DCID_PLACEHOLDER = "self"

# Only keep every third sample place.
SAMPLE_PLACE_STEP = 3


@dataclass
class PlaceMetadata:
  """Place metadata for subject pages."""
  place_dcid: str
  place_name: str = None
  place_type: str = None
  parent_places: List[str] = None
  # If set, use this to override the contained_place_types map in config metadata.
  contained_place_types: Dict[str, str] = None
  # Corresponds to typescript type ChildPlacesByType
  child_places: Dict[str, List[Dict[str, Union[str, int]]]] = None
  # Set to true if there was an error generating this object
  is_error: bool = False


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
  """
  Returns true if stat_var exists for all places in stat_vars_existence. Also
  supports "self" placeholder replacement.
  """
  sv_entity = stat_vars_existence.get(stat_var, {})
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
  """
  Returns all comparison places from bar charts in the config. Supports "self"
  placeholder replacement.
  """
  places = set()
  for category in page_config.categories:
    for block in category.blocks:
      for column in block.columns:
        for t in column.tiles:
          if t.type == subject_page_pb2.Tile.TileType.BAR:
            for p in t.comparison_places:
              if p == SELF_PLACE_DCID_PLACEHOLDER:
                places.add(place_dcid)
              else:
                places.add(p)
  return list(places)


def _places_with_geojson(places):
  """
  Returns the list of places, filtered for those which have a geoJsonCoordinates
  property.
  """
  result = []
  resp = fetch.properties(places)
  for place, place_props in resp.items():
    if 'geoJsonCoordinates' in place_props:
      result.append(place)
  return result


def remove_empty_charts(page_config, place_dcid, contained_place_type=None):
  """
  Returns the page config stripped of charts with no data.
  """
  ctr = nl_ctr.Counters()

  all_stat_vars = get_all_variables(page_config)
  if not all_stat_vars:
    return page_config

  # TODO: find child places only if there are maps, etc.
  sample_child_places = [] if contained_place_type == None else nl_utils.get_sample_child_places(
      place_dcid, contained_place_type, ctr)[::SAMPLE_PLACE_STEP]
  bar_comparison_places = _bar_comparison_places(page_config, place_dcid)
  all_places = sample_child_places + bar_comparison_places + [place_dcid]
  stat_vars_existence = fetch.observation_existence(all_stat_vars, all_places)

  child_places_geojson = _places_with_geojson(sample_child_places)

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
              filtered_keys = [k for k in t.stat_var_key if child_exist_keys[k]]
            else:
              # Should be the comparison places.
              comparison_exist_keys = _exist_keys_category(
                  t.comparison_places, category, stat_vars_existence,
                  place_dcid)
              filtered_keys = [
                  k for k in t.stat_var_key if comparison_exist_keys[k]
              ]
          elif t.type == subject_page_pb2.Tile.TileType.MAP:
            if len(child_places_geojson) == 0:
              continue
            filtered_keys = [k for k in t.stat_var_key if child_exist_keys[k]]
          elif t.type in PLACE_FILTER_TILE_TYPES:
            filtered_keys = [k for k in t.stat_var_key if place_exist_keys[k]]
          elif t.type in CHILD_FILTER_TILE_TYPES:
            filtered_keys = [k for k in t.stat_var_key if child_exist_keys[k]]
          else:
            new_tiles.append(t)
            continue
          if len(filtered_keys) >= TILE_MIN_SV_KEYS.get(t.type, 1):
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


def place_metadata(place_dcid, get_child_places=True) -> PlaceMetadata:
  """
  Returns place metadata needed to render a subject page config for a given dcid.
  """
  place_types = [DEFAULT_PLACE_TYPE]
  parent_places = []
  if place_dcid != DEFAULT_PLACE_DCID:
    place_types = fetch.property_values([place_dcid], 'typeOf')[place_dcid]
    if not place_types:
      return PlaceMetadata(place_dcid=escape(place_dcid), is_error=True)
    wanted_place_types = [
        x for x in place_types if x in place_api.ALL_WANTED_PLACE_TYPES
    ]
    if len(wanted_place_types) == 0:
      return PlaceMetadata(place_dcid=escape(place_dcid), is_error=True)
    place_types = wanted_place_types

    for place in place_api.parent_places([place_dcid]).get(place_dcid, []):
      parent_places.append({
          'dcid': place.get('dcid', ''),
          'name': place.get('name', ''),
          'types': [place.get('type', '')]
      })

  place_name = place_api.get_i18n_name([place_dcid
                                       ]).get(place_dcid, escape(place_dcid))

  # If this is a European place, update the contained_place_types in the page
  # metadata to use a custom dict instead.
  parent_dcids = set([place.get("dcid", "") for place in parent_places])
  parent_dcids.add(place_dcid)
  contained_place_types = DEFAULT_CONTAINED_PLACE_TYPES
  for parent_dcid, contained_place_type_overrides in OVERRIDE_CONTAINED_PLACE_TYPES.items(
  ):
    if parent_dcid in parent_dcids:
      contained_place_types = contained_place_type_overrides

  filtered_child_places = {}
  if get_child_places:
    child_places = place_api.child_fetch(place_dcid)
    for place_type in child_places:
      child_places[place_type].sort(key=lambda x: x['pop'], reverse=True)
      child_places[place_type] = child_places[place_type][:place_api.
                                                          CHILD_PLACE_LIMIT]

    # Filter out unsupported place types
    supported_place_types = set(contained_place_types.keys())
    supported_place_types.update(contained_place_types.values())
    for ptype, places in child_places.items():
      if ptype in supported_place_types:
        filtered_child_places[ptype] = places

  # Find the main place type
  place_type = place_types[0]
  for pt in place_types:
    if pt in contained_place_types:
      place_type = pt
      break

  return PlaceMetadata(place_dcid=escape(place_dcid),
                       place_name=place_name,
                       place_type=place_type,
                       parent_places=parent_places,
                       child_places=filtered_child_places,
                       contained_place_types=contained_place_types)


def update_event_spec_by_type(page_config, place_type: str):
  """Updates default event severity filters to place type filter if specified."""
  for event_spec in page_config.metadata.event_type_spec.values():
    if place_type in event_spec.place_type_severity_filter:
      event_spec.default_severity_filter.MergeFrom(
          event_spec.place_type_severity_filter[place_type])
      event_spec.place_type_severity_filter.clear()
      continue
