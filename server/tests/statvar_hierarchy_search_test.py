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


class TestGetSearchResult(unittest.TestCase):

    def test_search_statvar_hierarchy_single_token(self):
        search_index = {
            'token1': {
                'group_1': {
                    'approxNumPv': 2,
                    'rankingName': 'token1 token2'
                },
                'sv_1_2': {
                    'approxNumPv': 3,
                    'rankingName': 'token1 token3, token4'
                },
                'group_31': {
                    'approxNumPv': 2,
                    'rankingName': 'token1 token5, token6'
                }
            }
        }
        with app.app_context():
            app.config['STAT_VAR_SEARCH_INDEX'] = search_index
            result = svh_search.get_search_result(["token1"])
            expected_result = ['group_1', 'group_31', 'sv_1_2']
            assert result == expected_result

    def test_search_statvar_hierarchy_multiple_tokens(self):
        search_index = {
            'token2': {
                'sv_1_1': {
                    'approxNumPv': 3,
                    'rankingName': 'token2 token3'
                },
                'sv_1_2': {
                    'approxNumPv': 3,
                    'rankingName': 'token2 token3, token4'
                }
            },
            'token3': {
                'sv_1_2': {
                    'approxNumPv': 3,
                    'rankingName': 'token2 token3, token4'
                },
                'group_3': {
                    'approxNumPv': 2,
                    'rankingName': 'token2 token4, token6'
                }
            },
            'token4': {
                'group_3': {
                    'approxNumPv': 2,
                    'rankingName': 'token2 token4, token6'
                },
                'sv3': {
                    'approxNumPv': 20,
                    'rankingName': 'token4'
                },
                'sv_1_2': {
                    'approxNumPv': 3,
                    'rankingName': 'token2 token3, token4'
                }
            }
        }
        with app.app_context():
            app.config['STAT_VAR_SEARCH_INDEX'] = search_index
            result = svh_search.get_search_result(
                ["token3", "token4", "token2"])
            expected_result = ['sv_1_2']
            assert result == expected_result

    def test_search_statvar_hierarchy_multiple_queries(self):
        search_index = {
            'token5': {
                'group_3': {
                    'approxNumPv': 2,
                    'rankingName': 'token2 token4, token6'
                },
                'sv_1_2': {
                    'approxNumPv': 3,
                    'rankingName': 'token2 token3, token4'
                }
            },
            'token6': {
                'sv_1_2': {
                    'approxNumPv': 3,
                    'rankingName': 'token2 token3, token4'
                },
                'sv_1_1': {
                    'approxNumPv': 3,
                    'rankingName': 'token2 token3'
                }
            },
            'token7': {
                'group_3': {
                    'approxNumPv': 2,
                    'rankingName': 'token2 token4, token6'
                },
                'sv3': {
                    'approxNumPv': 20,
                    'rankingName': 'token4'
                },
                'sv_1_2': {
                    'approxNumPv': 3,
                    'rankingName': 'token2 token3, token4'
                }
            }
        }

        with app.app_context():
            app.config['STAT_VAR_SEARCH_INDEX'] = search_index
            result1 = svh_search.get_search_result(["token6", "token7"])
            expected_result1 = ['sv_1_2']
            assert result1 == expected_result1

            result2 = svh_search.get_search_result(
                ["token6", "token7", "token5"])
            expected_result2 = ['sv_1_2']
            assert result2 == expected_result2
