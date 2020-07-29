# Copyright 2020 Google LLC
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

"""
Tests the import_data.py script.
    Typical usage:
    python3 simplify_test.py
"""

import unittest
import geojson
import simplify

TEST_DATA_DIR = "test-data/"


class GeojsonSimplifierTest(unittest.TestCase):
    def test_california(self):
        simplifier = simplify.GeojsonSimplifier()
        simplifier.read_geojson(TEST_DATA_DIR + 'cali.geojson')
        simplifier.simplify()
        result = simplifier.simple_geojson
        with open(TEST_DATA_DIR + 'cali-simple.geojson', 'r') as f:
            expected_result = geojson.load(f)
        self.assertDictEqual(result, expected_result)

    def test_alabama(self):
        simplifier = simplify.GeojsonSimplifier()
        simplifier.read_geojson(TEST_DATA_DIR + 'alabama.geojson')
        simplifier.simplify()
        result = simplifier.simple_geojson
        with open(TEST_DATA_DIR + 'alabama-simple.geojson', 'r') as f:
            expected_result = geojson.load(f)
        self.assertDictEqual(result, expected_result)


if __name__ == '__main__':
    unittest.main()
