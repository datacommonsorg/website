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

import unittest

from parameterized import parameterized

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection import palm_api

_INPUT1 = """
```
{
  "PLACES": ["California"],
  "METRICS": ["asthma"],
  "SUB_PLACE_TYPE": "COUNTY",
  "COMPARISON_FILTER": [
    {
      "COMPARISON_METRIC": "median age",
      "COMPARISON_OPERATOR": "GREATER_THAN",
      "VALUE": 40
    }
  ]
}
```

I set the "SUB_PLACE_TYPE" to "COUNTY" because the sentence specifies "California counties". I set the "COMPARISON_FILTER" to include a condition that the median age is over 40, because the sentence also specifies that.
"""

_INPUT2 = """
Sure, here is the JSON representation of the sentence "countries in the world where poverty has grown the most":

```
{
  "PLACES": ["world"],
  "METRICS": ["poverty"],
  "GROWTH": "INCREASE",
  "RANK": "HIGH",
  "SUB_PLACE_TYPE": "COUNTRY"
}
```

I have set the following enum values:

* **GROWTH** to **INCREASE** because the sentence asks about countries where poverty has grown the most.
* **RANK** to **HIGH** because the sentence asks about countries where poverty has grown the most.
* **SUB_PLACE_TYPE** to **COUNTRY** because the sentence asks about countries.
"""

_INPUT3 = """
I'm a fancy LLM that makes up stuff willy-nilly when humans bore me with their stupid questions.
"""


class TestParseResponse(unittest.TestCase):

  @parameterized.expand([
      (_INPUT1, {
          'COMPARISON_FILTER': [{
              'COMPARISON_METRIC': 'median age',
              'COMPARISON_OPERATOR': 'GREATER_THAN',
              'VALUE': 40
          }],
          'METRICS': ['asthma'],
          'PLACES': ['California'],
          'SUB_PLACE_TYPE': 'COUNTY'
      }),
      (_INPUT2, {
          'GROWTH': 'INCREASE',
          'METRICS': ['poverty'],
          'PLACES': ['world'],
          'RANK': 'HIGH',
          'SUB_PLACE_TYPE': 'COUNTRY'
      }),
      (_INPUT3, {}),
  ])
  def test_main(self, input, want):
    self.maxDiff = None
    response = {'candidates': [{'content': input}]}
    got = palm_api.parse_response('', response, Counters())
    self.assertEqual(got, want)
