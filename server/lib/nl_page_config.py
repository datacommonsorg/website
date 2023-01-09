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

from lib.nl_chart_spec import ChartSpec
from config import subject_page_pb2
import services.datacommons as dc

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


def build_page_config(spec: ChartSpec, relevant_svs: List[str],
                      extended_svs: List[str]):

  sv2name = get_sv_name(relevant_svs + extended_svs)
  # Init
  page_config = subject_page_pb2.SubjectPageConfig()
  # Set metadata
  page_config.metadata.place_dcid.append(spec.main.place)
  page_config.metadata.contained_place_types[
      spec.main.type] = spec.contained.contained_place_type
  # Set category data
  category = page_config.categories.add()

  # Main place
  block = category.blocks.add()
  block.title = spec.main.name
  column = block.columns.add()
  for sv in spec.main.svs:
    tile = column.tiles.add()
    tile.type = subject_page_pb2.Tile.TileType.LINE
    tile.title = sv2name[sv]
    tile.stat_var_key.append(sv)
    category.stat_var_spec[sv].stat_var = sv
    category.stat_var_spec[sv].name = sv2name[sv]

  # Nearby place
  if spec.nearby.sv2places:
    block = category.blocks.add()
    block.title = "{} near {}".format(
        pluralize_place_type(spec.main.type).capitalize(), spec.main.name)
    column = block.columns.add()
    for sv, places in spec.nearby.sv2places.items():
      tile = column.tiles.add()
      tile.type = subject_page_pb2.Tile.TileType.BAR
      tile.title = sv2name[sv]
      tile.comparison_places[:] = places
      tile.stat_var_key.append(sv)
      category.stat_var_spec[sv].stat_var = sv
      category.stat_var_spec[sv].name = sv2name[sv]

  # Contained place
  if spec.contained.svs:
    block = category.blocks.add()
    block.title = "{} in {}".format(
        pluralize_place_type(spec.contained.contained_place_type).capitalize(),
        spec.main.name)
    column = block.columns.add()
    tile = column
    for sv in spec.contained.svs:
      tile = column.tiles.add()
      tile.type = subject_page_pb2.Tile.TileType.MAP
      tile.title = sv2name[sv] + ' (${date})'
      tile.stat_var_key.append(sv)
      category.stat_var_spec[sv].stat_var = sv
      category.stat_var_spec[sv].name = sv2name[sv]

  return page_config
