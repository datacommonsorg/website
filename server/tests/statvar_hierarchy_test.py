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

import lib.statvar_hierarchy as svh


class TestGetStatVarSearchIndex(unittest.TestCase):

    @patch('lib.statvar_hierarchy.dc.get_statvar_groups')
    def test_get_statvar_search_index(self, mock_statvar_groups):
        mock_statvar_groups.return_value = {
            "group1": {
                "absoluteName":
                    "token1 token2",
                "childStatVars": [{
                    "id": "sv1",
                    "searchName": "token1 token3",
                    "displayName": "sv1"
                }, {
                    "id": "sv2",
                    "searchName": "token2 token3, token4",
                    "displayName": "sv2"
                }],
                "childStatVarGroups": [{
                    "id": "group4",
                    "specializedEntity": "specializedEntity4"
                }]
            },
            "group3": {
                "absoluteName":
                    "token2 token5, token6",
                "childStatVars": [{
                    "id": "sv3",
                    "searchName": "token7 token6",
                    "displayName": "sv3"
                }, {
                    "id": "sv4",
                    "searchName": "token5",
                    "displayName": "sv4"
                }],
                "childStatVarGroups": [{
                    "id": "group4",
                    "specializedEntity": "specializedEntity4"
                }]
            },
            "group4": {
                "absoluteName":
                    "token1, token6",
                "childStatVars": [{
                    "id": "sv5",
                    "searchName": "token6 token7",
                    "displayName": "sv5"
                }],
            },
        }
        result = svh.getStatVarSearchIndex()
        expected_result = {
            "token1": {"group1", "sv1", "group4"},
            "token2": {"group1", "sv2", "group3"},
            "token3": {"sv1", "sv2"},
            "token4": {"sv2"},
            "token5": {"group3", "sv4"},
            "token6": {"group3", "sv3", "group4", "sv5"},
            "token7": {"sv3", "sv5"}
        }
        assert result == expected_result
