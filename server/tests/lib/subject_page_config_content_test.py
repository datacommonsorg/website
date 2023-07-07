# Copyright 2022 Google LLC
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

import unittest

from server.config import subject_page_pb2
import server.lib.util as libutil

TileType = subject_page_pb2.Tile.TileType
BlockType = subject_page_pb2.Block.BlockType
BLOCK_TYPE_ALLOWED_TILES = {
    BlockType.TYPE_NONE: {
        TileType.LINE: "",
        TileType.BAR: "",
        TileType.MAP: "",
        TileType.SCATTER: "",
        TileType.BIVARIATE: "",
        TileType.RANKING: "",
        TileType.HIGHLIGHT: "",
        TileType.DESCRIPTION: "",
        TileType.PLACE_OVERVIEW: "",
        TileType.GAUGE: "",
    },
    BlockType.DISASTER_EVENT: {
        TileType.DISASTER_EVENT_MAP: "",
        TileType.TOP_EVENT: "",
        TileType.HISTOGRAM: "",
    }
}


class TestSubjectPageConfigs(unittest.TestCase):

  def verify_statvars(self, category, msg):
    defined_svs = {}
    for i, (svm_id, svm) in enumerate(category.stat_var_spec.items()):
      svm_msg = f"{msg}[sv={i},{svm_id}]"
      self.assertFalse(svm_id in defined_svs, svm_msg)
      defined_svs[svm_id] = svm
    return defined_svs

  def verify_event_type_specs(self, page, msg):
    defined_events = {}
    for i, (event_type_id, event_type_spec) in enumerate(
        page.metadata.event_type_spec.items()):
      event_message = f"{msg}[event={i},{event_type_id}]"
      self.assertFalse(event_type_id in defined_events, event_message)
      self.assertEqual(event_type_id, event_type_spec.id, msg)
      defined_events[event_type_id] = event_type_spec
    return defined_events

  def verify_tile(self, tile, stat_vars, msg, event_type_specs):
    """Verifies a single tile"""
    self.assertNotEqual(tile.type, TileType.TYPE_NONE, msg)

    # Non-chart tiles should have a title
    if not (tile.type == TileType.RANKING or tile.type == TileType.HIGHLIGHT or
            tile.type == TileType.DESCRIPTION or
            tile.type == TileType.DISASTER_EVENT_MAP):
      self.assertNotEqual(tile.title, '', msg)

    if tile.type == TileType.RANKING:
      self.assertIsNotNone(tile.ranking_tile_spec, msg)

    if tile.type == TileType.GAUGE:
      self.assertIsNotNone(tile.gauge_tile_spec, msg)

    if tile.type == TileType.DISASTER_EVENT_MAP:
      self.assertIsNotNone(tile.disaster_event_map_tile_spec, msg)
      for i, event_type_id in enumerate(
          tile.disaster_event_map_tile_spec.point_event_type_key):
        self.assertTrue(event_type_id in event_type_specs,
                        f"{msg}[pointEvent={i},{event_type_id}]")
      for i, event_type_id in enumerate(
          tile.disaster_event_map_tile_spec.polygon_event_type_key):
        self.assertTrue(event_type_id in event_type_specs,
                        f"{msg}[polygonEvent={i},{event_type_id}]")
        self.assertIsNotNone(
            event_type_specs[event_type_id].polygon_geo_json_prop,
            f"{msg}[polygonEvent={i},{event_type_id}]")
      for i, event_type_id in enumerate(
          tile.disaster_event_map_tile_spec.path_event_type_key):
        self.assertTrue(event_type_id in event_type_specs,
                        f"{msg}[pathEvent={i},{event_type_id}]")
        self.assertIsNotNone(event_type_specs[event_type_id].path_geo_json_prop,
                             f"{msg}[pathEvent={i},{event_type_id}]")

    if (tile.type == TileType.HIGHLIGHT or tile.type == TileType.DESCRIPTION):
      self.assertNotEqual(tile.description, '', msg)

    for i, sv_id in enumerate(tile.stat_var_key):
      self.assertTrue(sv_id in stat_vars, f"{msg}[sv={i},{sv_id}]")

  def test_required_fields(self):
    """Tests all configs loaded at server start"""
    all_configs = {}
    all_configs.update(libutil.get_topic_page_config())
    all_configs.update({
        "nl_disasters": [libutil.get_nl_disaster_config()],
        "disaster_dashboard": [libutil.get_disaster_dashboard_config()],
        "sustainability": [libutil.get_disaster_sustainability_config()],
    })
    for id, configs in all_configs.items():
      if id == 'sdg':
        continue
      for page_i, page in enumerate(configs):
        page_msg = f"{id}[config={page_i}]"
        self.assertNotEqual(page.metadata.topic_id, '', page_msg)
        self.assertNotEqual(page.metadata.topic_name, '', page_msg)
        self.assertGreater(
            len(page.metadata.place_dcid) + len(page.metadata.place_group), 0,
            page_msg)
        self.assertGreater(len(page.metadata.contained_place_types), 0,
                           page_msg)
        event_type_specs = self.verify_event_type_specs(page, page_msg)

        for cat_i, cat in enumerate(page.categories):
          cat_msg = f"{page_msg}[category={cat_i}]"
          self.assertNotEqual(cat.title, '', cat_msg)

          stat_vars = self.verify_statvars(cat, cat_msg)

          for block_i, block in enumerate(cat.blocks):
            block_msg = f"{cat_msg}[block={block_i}]"

            for col_i, col in enumerate(block.columns):
              for t_i, tile in enumerate(col.tiles):
                tile_msg = f"{block_msg}[col={col_i};tile={t_i}]"
                self.assertTrue(
                    tile.type in BLOCK_TYPE_ALLOWED_TILES[block.type], tile_msg)
                self.verify_tile(tile, stat_vars, tile_msg, event_type_specs)
