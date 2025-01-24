# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

from server.lib import topic_cache
from server.lib.nl.explore.params import DCNames

_TEST_MODE = os.environ.get('TEST_MODE', '')

_TEST_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "test_data", "topic_cache")
_INPUT_DIR = os.path.join(_TEST_DATA_DIR, "input")
_EXPECTED_DIR = os.path.join(_TEST_DATA_DIR, "expected")
_MAIN_DC_TOPIC_CACHE_FILE = os.path.join(_INPUT_DIR, "main_dc_topic_cache.json")
_UNDATA_TOPIC_CACHE_FILE = os.path.join(_INPUT_DIR, "undata_topic_cache.json")
# The custom dc topic cache json will be in a file
# (datacommons/nl/custom_dc_topic_cache.json) relative to this path.
_CUSTOM_DC_MERGE_WITH_MAIN_USER_DATA_PATH = os.path.join(
    _INPUT_DIR, "merge_with_main")
_CUSTOM_DC_MERGE_WITH_UNDATA_USER_DATA_PATH = os.path.join(
    _INPUT_DIR, "merge_with_undata")


def _compare_files(test: unittest.TestCase, output_path: str,
                   expected_path: str, message: str):
  with open(output_path) as gotf:
    got = gotf.read()
    with open(expected_path) as wantf:
      want = wantf.read()
      test.assertEqual(got, want, message)


def _test_topic_cache_loader(test: unittest.TestCase, test_name: str):
  test.maxDiff = None

  with tempfile.TemporaryDirectory() as temp_dir:
    output_json_path = os.path.join(temp_dir, f"{test_name}.json")
    expected_json_path = os.path.join(_EXPECTED_DIR, f"{test_name}.json")

    topic_caches = topic_cache.load({})
    # Write json
    topic_caches_json = {
        dc: topic_cache.json() for dc, topic_cache in topic_caches.items()
    }
    with open(output_json_path, "w") as out:
      json.dump(topic_caches_json, out, indent=1)

    if _TEST_MODE == "write":
      shutil.copy(output_json_path, expected_json_path)
      return

    _compare_files(test, output_json_path, expected_json_path,
                   f"Found diffs in topic caches JSON: {test_name}")


@patch.dict(topic_cache.TOPIC_CACHE_FILES, {
    DCNames.MAIN_DC.value: [_MAIN_DC_TOPIC_CACHE_FILE],
    DCNames.UNDATA_DC.value: [_UNDATA_TOPIC_CACHE_FILE]
},
            clear=True)
class TestTopicCacheLoader(unittest.TestCase):

  @patch.dict(os.environ, {"IS_CUSTOM_DC": "false"})
  def test_main_only(self):
    """Tests that custom dc cache is not loaded if IS_CUSTOM_DC is not true."""
    _test_topic_cache_loader(self, "main_only")

  @patch.dict(
      os.environ, {
          "IS_CUSTOM_DC": "true",
          "USER_DATA_PATH": _CUSTOM_DC_MERGE_WITH_MAIN_USER_DATA_PATH
      })
  def test_main_and_custom(self):
    """Tests merging custom dc cache into main cache."""
    _test_topic_cache_loader(self, "main_and_custom")

  @patch.dict(
      os.environ, {
          "IS_CUSTOM_DC": "true",
          "USER_DATA_PATH": _CUSTOM_DC_MERGE_WITH_UNDATA_USER_DATA_PATH
      })
  def test_undata_and_custom(self):
    """Tests merging custom dc cache into undata cache."""
    _test_topic_cache_loader(self, "undata_and_custom")

  @patch.dict(os.environ, {"IS_CUSTOM_DC": "true"})
  def test_no_user_data_path(self):
    """Tests that when IS_CUSTOM_DC is true, but no user data path is specified,
    there are no failures."""
    _test_topic_cache_loader(self, "no_user_data_path")

  def test_load_nodes(self):
    """Tests _load_nodes function with various node configurations."""
    test_nodes = [
        {
            'dcid': ['topic1'],
            'typeOf': ['Topic'],
            'name': ['Topic 1'],
            'relevantVariableList': ['var1', 'var2']
        },
        {
            'dcid': ['topic2'],
            'typeOf': ['Topic'],
            'name': ['Topic 2'],
            'memberList': ['var3', 'var4']
        },
        {
            'dcid': ['topic3'],
            'typeOf': ['Topic'],
            'name': ['Topic 3'],
            # Missing both relevantVariableList and memberList
        }
    ]

    result = topic_cache._load_nodes(DCNames.MAIN_DC.value, test_nodes, {})

    # Check that only two nodes were processed
    self.assertEqual(len(result.out_map), 2)
    # Verify first node with relevantVariableList
    self.assertIn('topic1', result.out_map)
    self.assertEqual(result.out_map['topic1'].name, 'Topic 1')
    self.assertEqual(result.out_map['topic1'].vars, ['var1', 'var2'])
    # Verify second node with memberList
    self.assertIn('topic2', result.out_map)
    self.assertEqual(result.out_map['topic2'].name, 'Topic 2')
    self.assertEqual(result.out_map['topic2'].vars, ['var3', 'var4'])
    # Verify third node was skipped
    self.assertNotIn('topic3', result.out_map)
    # Verify in_map connections
    self.assertIn('var1', result.in_map)
    self.assertIn('var2', result.in_map)
    self.assertIn('var3', result.in_map)
    self.assertIn('var4', result.in_map)
    self.assertEqual(result.in_map['var1']['relevantVariable'], {'topic1'})
    self.assertEqual(result.in_map['var3']['member'], {'topic2'})
