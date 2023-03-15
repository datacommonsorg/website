# Copyright 2022 Google LLC
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

import datetime
import unittest

import server.lib.util as lib_util


class TestParseDate(unittest.TestCase):

  def test(self):
    data = {
        "2022": 1640995200,
        "2021-10": 1633046400,
        "2021-01-02": 1609545600,
    }
    for input in data:
      assert lib_util.parse_date(input).replace(
          tzinfo=datetime.timezone.utc).timestamp() == data[input]
