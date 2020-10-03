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

import unittest
import json
import routes.api.landing_page as landing_page


class TestBuildSpec(unittest.TestCase):
    chart_config = [{
        'category': 'Economics',
        'title': 'Unemployment Rate',
        'statsVars': ['UnemploymentRate_Person'],
        'isOverview': True
    }, {
        'category': 'Economics',
        'title': 'Labor Force Participation',
        'statsVars': ['Count_Person_InLaborForce'],
        'scaling': 100,
        'unit': '%',
    }]
    result = landing_page.build_spec(chart_config)
    with open('tests/test_data/golden_config.json') as f:
        expected = json.load(f)
        assert expected == result