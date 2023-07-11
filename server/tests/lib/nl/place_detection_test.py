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
"""Tests for nl_place_detection."""

import unittest
from unittest.mock import patch

from parameterized import parameterized

from server.lib.nl.detection import place
import server.services.datacommons as dc


class TestPlaceDetector(unittest.TestCase):

  @parameterized.expand([
      # All these queries should detect places (with the API response mock).
      # Note that the API response is tested separately in the API code under nl_server/
      ["tell me about chicago", ["chicago"], ["chicago"]],
      ["what about new delhi", ["new delhi"], ["new delhi"]],
      [
          "the place to live is singapore or hong kong",
          ["singapore", "hong kong"], ["singapore", "hong kong"]
      ],
      [
          "berkeley's economy and cambridge's", ["berkeley", "cambridge"],
          ["berkeley", "cambridge"]
      ],
      # Special places (do not need an API response).
      ["tell me about palo alto", ["palo alto"], []],
      ["what about mountain view", ["mountain view"], []],
      [
          "berkeley's economy and mountain view's",
          ["berkeley", "mountain view"], ["berkeley"]
      ],
  ])
  @patch.object(dc, 'nl_detect_place_ner')
  def test_heuristic_detection(self, query_str, expected, api_response,
                               mock_detect_place_ner):
    mock_detect_place_ner.return_value = api_response

    # Covert all detected place string to lower case.
    got = [s.lower() for s in place._detect_places(query_str)]
    self.assertEqual(expected, got)
