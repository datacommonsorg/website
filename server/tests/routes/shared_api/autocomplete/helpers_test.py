# Copyright 2024 Google LLC
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

from server.routes.shared_api.autocomplete import helpers

class TestHelpers(unittest.TestCase):

  def test_get_custom_place_suggestions(self):
    # Test single-word match
    result1 = helpers.get_custom_place_suggestions("europe")
    self.assertEqual(len(result1), 1)
    self.assertEqual(result1[0].description, "Europe")
    self.assertEqual(result1[0].place_dcid, "europe")

    # Test two-word match
    result2 = helpers.get_custom_place_suggestions("north america")
    self.assertEqual(len(result2), 1)
    self.assertEqual(result2[0].description, "North America")
    self.assertEqual(result2[0].place_dcid, "northamerica")

    # Test no match
    result3 = helpers.get_custom_place_suggestions("notaplace")
    self.assertEqual(len(result3), 0)

    # Test partial match with good score
    result4 = helpers.get_custom_place_suggestions("asia")
    self.assertEqual(len(result4), 1)
    self.assertEqual(result4[0].description, "Asia")
