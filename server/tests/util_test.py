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

import collections
import json
import unittest

import lib.util as libutil


class TestChartConfig(unittest.TestCase):

    def test_menu_text(self):
        chart_config = libutil.get_chart_config()
        menu = collections.defaultdict(list)
        for config in chart_config:
            menu[config['category'].lower()].append(config)
        for category in menu:
            menu[category].sort(key=lambda x: x.get('group', ''))
        # Get menu text
        got = []
        for category in libutil.PLACE_EXPLORER_CATEGORIES:
            data = []
            # The logic below mimics the client logic to generate the menu text.
            for topic_data in menu[category]:
                if 'group' in topic_data:
                    data.append('[{}] {}'.format(topic_data['group'],
                                                 topic_data['title']))
                else:
                    data.append(topic_data['title'])
            got.append(data)
        # Get expected text
        with open('tests/test_data/golden_menu_text.json',
                  encoding='utf-8') as f:
            expect = json.load(f)
            self.assertEqual(got, expect)