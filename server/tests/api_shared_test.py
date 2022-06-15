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
import routes.api.shared as shared_api

from unittest.mock import patch


class TestCachedName(unittest.TestCase):

    @patch('routes.api.shared.fetch_data')
    def test_cached_name(self, mock_data_fetcher):
        dcid1 = 'geoId/06'
        dcid2 = 'geoId/07'
        dcid3 = 'geoId/08'
        mock_response = {
            dcid1: {
                'out': [{
                    'value': 'California',
                    'provenance': 'prov1'
                }]
            },
            dcid2: {
                'out': []
            },
            dcid3: {
                'out': [{
                    'value': 'Colorado',
                    'provenance': 'prov2'
                }]
            }
        }
        mock_data_fetcher.side_effect = (
            lambda url, req, compress, post: mock_response)

        result = shared_api.cached_name('^'.join([dcid1, dcid2, dcid3]))
        assert result == {dcid1: 'California', dcid2: '', dcid3: 'Colorado'}


class TestIsFloat(unittest.TestCase):

    def test_is_float(self):
        cases = [{
            'query': 'abc',
            'expected': False
        }, {
            'query': '1.26',
            'expected': True
        }, {
            'query': '-',
            'expected': False
        }, {
            'query': '0.0',
            'expected': True
        }, {
            'query': '3',
            'expected': True
        }]
        for test_case in cases:
            result = shared_api.is_float(test_case.get("query"))
            assert result == test_case.get("expected")
