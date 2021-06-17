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
from unittest.mock import patch

import lib.statvar_hierarchy_search as svh_search
from main import app


class TestGetStatVarSearchIndex(unittest.TestCase):

    @patch('lib.statvar_hierarchy_search.dc.get_statvar_groups')
    def test_get_statvar_search_index(self, mock_statvar_groups):
        mock_statvar_groups.return_value = {
            "group_1": {
                "absoluteName":
                    "token1 token2",
                "childStatVars": [{
                    "id": "sv_1_1",
                    "searchName": "token1 token3",
                    "displayName": "sv1"
                }, {
                    "id": "sv_1_2",
                    "searchName": "token3, token4",
                    "displayName": "sv2"
                }],
                "childStatVarGroups": [{
                    "id": "group_3_1",
                    "specializedEntity": "specializedEntity4"
                }]
            },
            "group_3_1": {
                "absoluteName":
                    "token2, token4",
                "childStatVars": [{
                    "id": "sv_3",
                    "searchName": "token2",
                    "displayName": "sv3"
                }, {
                    "id": "sv3",
                    "searchName": "token4,",
                    "displayName": "sv4"
                }],
            },
        }
        result = svh_search.get_statvar_search_index()
        print(result)
        expected_result = {
            'token1': {
                'group_1': {
                    'approxNumPv': 2,
                    'rankingName': 'token1 token2'
                },
                'sv_1_1': {
                    'approxNumPv': 3,
                    'rankingName': 'token1 token3'
                }
            },
            'token2': {
                'group_1': {
                    'approxNumPv': 2,
                    'rankingName': 'token1 token2'
                },
                'group_3_1': {
                    'approxNumPv': 3,
                    'rankingName': 'token2, token4'
                },
                'sv_3': {
                    'approxNumPv': 2,
                    'rankingName': 'token2'
                }
            },
            'token3': {
                'sv_1_1': {
                    'approxNumPv': 3,
                    'rankingName': 'token1 token3'
                },
                'sv_1_2': {
                    'approxNumPv': 3,
                    'rankingName': 'token3, token4'
                }
            },
            'token4': {
                'sv_1_2': {
                    'approxNumPv': 3,
                    'rankingName': 'token3, token4'
                },
                'group_3_1': {
                    'approxNumPv': 3,
                    'rankingName': 'token2, token4'
                },
                'sv3': {
                    'approxNumPv': 20,
                    'rankingName': 'token4,'
                }
            }
        }
        assert result == expected_result