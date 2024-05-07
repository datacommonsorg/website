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

import os
import unittest
from unittest.mock import patch

TEST_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "test_data", "topic_cache")
INPUT_DIR = os.path.join(TEST_DATA_DIR, "input")
EXPECTED_DIR = os.path.join(TEST_DATA_DIR, "expected")
MAIN_DC_TOPIC_CACHE_FILE = os.path.join(INPUT_DIR, "main_dc_topic_cache.json")
# Same value as INPUT_DIR but the custom dc topic cache json will
# be in a file (datacommons/nl/custom_dc_topic_cache.json) relative to this path.
CUSTOM_DC_USER_DATA_PATH = INPUT_DIR


def _compare_files(test: unittest.TestCase, output_path, expected_path):
  with open(output_path) as gotf:
    got = gotf.read()
    with open(expected_path) as wantf:
      want = wantf.read()
      test.assertEqual(got, want)


class TestTopicCache(unittest.TestCase):
  pass
