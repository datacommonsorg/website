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


def get_all_variables(page_config):
  """Get all the variables from a page config"""
  result = []
  for category in page_config.categories:
    for _, spec in category.stat_var_spec.items():
      result.append(spec.stat_var)
  return result


def select_tile(tile, stat_var_key, chart_type):
  """Whether to select a tile based on given variable and chart_type"""
  if tile.type != chart_type:
    return False
  # When there are multiple stat vars for this tile, this will not be a match
  # TODO: re-visit this condition based on the chart logic.
  if len(tile.stat_var_key) != 1:
    return False
  return tile.stat_var_key[0] == stat_var_key


def trim_config(page_config, variable, chart_type):
  """Trim the config based on given variable anda chart_type"""
  for category in page_config.categories:
    for stat_var_key, spec in category.stat_var_spec.items():
      if spec.stat_var == variable:
        for block in category.blocks:
          for column in block.columns:
            # Remove selected tiles
            tiles = [
                x for x in column.tiles
                if not select_tile(x, stat_var_key, chart_type)
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
