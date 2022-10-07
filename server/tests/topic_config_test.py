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

from google.protobuf import text_format
from config import topic_page_pb2

import lib.util as libutil

TileType = topic_page_pb2.Tile.TileType


class TestTopicConfig(unittest.TestCase):

    def verify_statvars(self, category, msg):
        defined_svs = {}
        for i, (svm_id, svm) in enumerate(category.stat_var_spec.items()):
            svm_msg = f"{msg}[sv={i},{svm_id}]"
            self.assertFalse(svm_id in defined_svs, svm_msg)
            defined_svs[svm_id] = svm
        return defined_svs

    def verify_tile(self, tile, stat_vars, msg):
        """Verifies a single tile"""
        self.assertNotEqual(tile.type, TileType.TYPE_NONE, msg)

        # Non-chart tiles should have a title
        if not (tile.type == TileType.RANKING or tile.type == TileType.HIGHLIGHT
                or tile.type == TileType.DESCRIPTION):
            self.assertNotEqual(tile.title, '', msg)

        if tile.type == TileType.RANKING:
            self.assertIsNotNone(tile.ranking_metadata, msg)

        if (tile.type == TileType.HIGHLIGHT or
                tile.type == TileType.DESCRIPTION):
            self.assertNotEqual(tile.description, '', msg)

        for i, sv_id in enumerate(tile.stat_var_key):
            self.assertTrue(sv_id in stat_vars, f"{msg}[sv={i},{sv_id}]")

    def test_required_fields(self):
        """Tests all configs loaded at server start"""
        all_configs = libutil.get_topic_page_config()
        for id, configs in all_configs.items():
            for page_i, page in enumerate(configs):
                page_msg = f"{id}[config={page_i}]"
                self.assertNotEqual(page.metadata.topic_id, '', page_msg)
                self.assertNotEqual(page.metadata.topic_name, '', page_msg)
                self.assertGreater(len(page.metadata.place_dcid), 0, page_msg)
                self.assertGreater(len(page.metadata.contained_place_types), 0,
                                   page_msg)

                for cat_i, cat in enumerate(page.categories):
                    cat_msg = f"{page_msg}[category={cat_i}]"
                    self.assertNotEqual(cat.title, '', cat_msg)

                    stat_vars = self.verify_statvars(cat, cat_msg)

                    for block_i, block in enumerate(cat.blocks):
                        block_msg = f"{cat_msg}[block={block_i}]"

                        for t_i, tile in enumerate(block.left_tiles):
                            tile_msg = f"{block_msg}[left={t_i}]"
                            self.verify_tile(tile, stat_vars, tile_msg)

                        for t_i, tile in enumerate(block.right_tiles):
                            tile_msg = f"{block_msg}[right={t_i}]"
                            self.verify_tile(tile, stat_vars, tile_msg)
