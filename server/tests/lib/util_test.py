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
import json
import unittest
from unittest.mock import patch

import server.lib.util as lib_util
from web_app import app


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


class TestPostBodyCacheKey(unittest.TestCase):

  def test_post_body_cache_key(self):
    test_data = {'key1': 'value1', 'key3': 'value3', 'key2': 'value2'}

    with app.test_request_context('/test', method='POST', json=test_data):
      # Get the expected cache key
      expected_cache_key = f"/test?," + json.dumps(test_data, sort_keys=True)

      # Ensure calculated cache value matches
      cache_key = lib_util.post_body_cache_key()
      self.assertEqual(cache_key, expected_cache_key)

  def test_post_body_with_query_params_cache_key(self):
    test_data = {'key1': 'value1', 'key3': 'value3', 'key2': 'value2'}

    with app.test_request_context('/test?a=b&c=d',
                                  method='POST',
                                  json=test_data):
      # Get the expected cache key
      expected_cache_key = f"/test?a=b&c=d," + json.dumps(test_data,
                                                          sort_keys=True)

      # Ensure calculated cache value matches
      cache_key = lib_util.post_body_cache_key()
      self.assertEqual(cache_key, expected_cache_key)


class TestFlattenObsSeriesResponse(unittest.TestCase):

    def test_single_variable_single_entity(self):
        obs_series_response = {
            "byVariable": {
                "Count_Person": {
                    "byEntity": {
                        "country/USA": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550201",
                                    "observations": [
                                        {"date": "1900", "value": 76094000},
                                        {"date": "1901", "value": 77584000}
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        }
        expected_output = [
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
            {'date': '1901', 'entity': 'country/USA', 'facet': '2176550201', 'value': 77584000, 'variable': 'Count_Person'}
        ]
        self.assertEqual(lib_util.flatten_obs_series_response(obs_series_response), expected_output)

    def test_multiple_variables_single_entity(self):
        obs_series_response = {
            "byVariable": {
                "Count_Person": {
                    "byEntity": {
                        "country/USA": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550201",
                                    "observations": [
                                        {"date": "1900", "value": 76094000},
                                        {"date": "1901", "value": 77584000}
                                    ]
                                }
                            ]
                        }
                    }
                },
                "Count_Household": {
                    "byEntity": {
                        "country/USA": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550202",
                                    "observations": [
                                        {"date": "1900", "value": 15000000},
                                        {"date": "1901", "value": 15500000}
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        }
        expected_output = [
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
            {'date': '1901', 'entity': 'country/USA', 'facet': '2176550201', 'value': 77584000, 'variable': 'Count_Person'},
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550202', 'value': 15000000, 'variable': 'Count_Household'},
            {'date': '1901', 'entity': 'country/USA', 'facet': '2176550202', 'value': 15500000, 'variable': 'Count_Household'}
        ]
        self.assertEqual(lib_util.flatten_obs_series_response(obs_series_response), expected_output)

    def test_single_variable_multiple_entities(self):
        obs_series_response = {
            "byVariable": {
                "Count_Person": {
                    "byEntity": {
                        "country/USA": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550201",
                                    "observations": [
                                        {"date": "1900", "value": 76094000},
                                        {"date": "1901", "value": 77584000}
                                    ]
                                }
                            ]
                        },
                        "country/CAN": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550203",
                                    "observations": [
                                        {"date": "1900", "value": 5400000},
                                        {"date": "1901", "value": 5500000}
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        }
        expected_output = [
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
            {'date': '1901', 'entity': 'country/USA', 'facet': '2176550201', 'value': 77584000, 'variable': 'Count_Person'},
            {'date': '1900', 'entity': 'country/CAN', 'facet': '2176550203', 'value': 5400000, 'variable': 'Count_Person'},
            {'date': '1901', 'entity': 'country/CAN', 'facet': '2176550203', 'value': 5500000, 'variable': 'Count_Person'}
        ]
        self.assertEqual(lib_util.flatten_obs_series_response(obs_series_response), expected_output)

    def test_multiple_variables_multiple_entities(self):
        obs_series_response = {
            "byVariable": {
                "Count_Person": {
                    "byEntity": {
                        "country/USA": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550201",
                                    "observations": [
                                        {"date": "1900", "value": 76094000},
                                        {"date": "1901", "value": 77584000}
                                    ]
                                }
                            ]
                        },
                        "country/CAN": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550203",
                                    "observations": [
                                        {"date": "1900", "value": 5400000},
                                        {"date": "1901", "value": 5500000}
                                    ]
                                }
                            ]
                        }
                    }
                },
                "Count_Household": {
                    "byEntity": {
                        "country/USA": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550202",
                                    "observations": [
                                        {"date": "1900", "value": 15000000},
                                        {"date": "1901", "value": 15500000}
                                    ]
                                }
                            ]
                        },
                        "country/CAN": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550204",
                                    "observations": [
                                        {"date": "1900", "value": 1000000},
                                        {"date": "1901", "value": 1100000}
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        }
        expected_output = [
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
            {'date': '1901', 'entity': 'country/USA', 'facet': '2176550201', 'value': 77584000, 'variable': 'Count_Person'},
            {'date': '1900', 'entity': 'country/CAN', 'facet': '2176550203', 'value': 5400000, 'variable': 'Count_Person'},
            {'date': '1901', 'entity': 'country/CAN', 'facet': '2176550203', 'value': 5500000, 'variable': 'Count_Person'},
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550202', 'value': 15000000, 'variable': 'Count_Household'},
            {'date': '1901', 'entity': 'country/USA', 'facet': '2176550202', 'value': 15500000, 'variable': 'Count_Household'},
            {'date': '1900', 'entity': 'country/CAN', 'facet': '2176550204', 'value': 1000000, 'variable': 'Count_Household'},
            {'date': '1901', 'entity': 'country/CAN', 'facet': '2176550204', 'value': 1100000, 'variable': 'Count_Household'}
        ]
        self.assertEqual(lib_util.flatten_obs_series_response(obs_series_response), expected_output)


class TestFlattenedObservationsToDatesByVariable(unittest.TestCase):

    def test_single_variable_single_date_single_facet(self):
        flattened_observations = [
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'}
        ]
        expected_output = [
            {
                'variable': 'Count_Person',
                'observationDates': [
                    {
                        'date': '1900',
                        'entityCount': [
                            {
                                'facet': '2176550201',
                                'count': 1
                            }
                        ]
                    }
                ]
            }
        ]
        self.assertEqual(lib_util.flattened_observations_to_dates_by_variable(flattened_observations), expected_output)

    def test_single_variable_multiple_dates_single_facet(self):
        flattened_observations = [
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
            {'date': '1901', 'entity': 'country/USA', 'facet': '2176550201', 'value': 77584000, 'variable': 'Count_Person'}
        ]
        expected_output = [
            {
                'variable': 'Count_Person',
                'observationDates': [
                    {
                        'date': '1900',
                        'entityCount': [
                            {
                                'facet': '2176550201',
                                'count': 1
                            }
                        ]
                    },
                    {
                        'date': '1901',
                        'entityCount': [
                            {
                                'facet': '2176550201',
                                'count': 1
                            }
                        ]
                    }
                ]
            }
        ]
        self.assertEqual(lib_util.flattened_observations_to_dates_by_variable(flattened_observations), expected_output)

    def test_multiple_variables_single_date_single_facet(self):
        flattened_observations = [
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550202', 'value': 15000000, 'variable': 'Count_Household'}
        ]
        expected_output = [
            {
                'variable': 'Count_Household',
                'observationDates': [
                    {
                        'date': '1900',
                        'entityCount': [
                            {
                                'facet': '2176550202',
                                'count': 1
                            }
                        ]
                    }
                ]
            },
            {
                'variable': 'Count_Person',
                'observationDates': [
                    {
                        'date': '1900',
                        'entityCount': [
                            {
                                'facet': '2176550201',
                                'count': 1
                            }
                        ]
                    }
                ]
            }
        ]
        self.assertEqual(lib_util.flattened_observations_to_dates_by_variable(flattened_observations), expected_output)

    def test_single_variable_single_date_multiple_facets(self):
        flattened_observations = [
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550202', 'value': 15000000, 'variable': 'Count_Person'}
        ]
        expected_output = [
            {
                'variable': 'Count_Person',
                'observationDates': [
                    {
                        'date': '1900',
                        'entityCount': [
                            {
                                'facet': '2176550201',
                                'count': 1
                            },
                            {
                                'facet': '2176550202',
                                'count': 1
                            }
                        ]
                    }
                ]
            }
        ]
        self.assertEqual(lib_util.flattened_observations_to_dates_by_variable(flattened_observations), expected_output)

    def test_multiple_variables_multiple_dates_multiple_facets(self):
        flattened_observations = [
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
            {'date': '1901', 'entity': 'country/USA', 'facet': '2176550201', 'value': 77584000, 'variable': 'Count_Person'},
            {'date': '1900', 'entity': 'country/USA', 'facet': '2176550202', 'value': 15000000, 'variable': 'Count_Household'},
            {'date': '1901', 'entity': 'country/USA', 'facet': '2176550202', 'value': 15500000, 'variable': 'Count_Household'}
        ]
        expected_output = [
            {
                'variable': 'Count_Household',
                'observationDates': [
                    {
                        'date': '1900',
                        'entityCount': [
                            {
                                'facet': '2176550202',
                                'count': 1
                            }
                        ]
                    },
                    {
                        'date': '1901',
                        'entityCount': [
                            {
                                'facet': '2176550202',
                                'count': 1
                            }
                        ]
                    }
                ]
            },
            {
                'variable': 'Count_Person',
                'observationDates': [
                    {
                        'date': '1900',
                        'entityCount': [
                            {
                                'facet': '2176550201',
                                'count': 1
                            }
                        ]
                    },
                    {
                        'date': '1901',
                        'entityCount': [
                            {
                                'facet': '2176550201',
                                'count': 1
                            }
                        ]
                    }
                ]
            }
        ]
        self.assertEqual(lib_util.flattened_observations_to_dates_by_variable(flattened_observations), expected_output)


class TestGetSeriesDatesFromEntities(unittest.TestCase):
    maxDiff = None
    @patch('server.services.datacommons.obs_series')
    def test_single_variable_single_entity(self, mock_obs_series):
        mock_obs_series.return_value = {
            "byVariable": {
                "Count_Person": {
                    "byEntity": {
                        "country/USA": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550201",
                                    "observations": [
                                        {"date": "1900", "value": 76094000},
                                        {"date": "1901", "value": 77584000}
                                    ]
                                }
                            ]
                        }
                    }
                }
            },
            "facets": {
                "2176550201": {"importName": "facet1"}
            }
        }

        entities = ["country/USA"]
        variables = ["Count_Person"]
        expected_output = {
            'datesByVariable': [
                {
                    'variable': 'Count_Person',
                    'observationDates': [
                        {
                            'date': '1900',
                            'entityCount': [
                                {
                                    'facet': '2176550201',
                                    'count': 1
                                }
                            ]
                        },
                        {
                            'date': '1901',
                            'entityCount': [
                                {
                                    'facet': '2176550201',
                                    'count': 1
                                }
                            ]
                        }
                    ]
                }
            ],
            'facets': {
                '2176550201': {"importName": "facet1"}
            }
        }

        result = lib_util.get_series_dates_from_entities(entities, variables)
        self.assertEqual(result, expected_output)

    @patch('server.services.datacommons.obs_series')
    def test_multiple_variables_multiple_entities(self, mock_obs_series):
        mock_obs_series.return_value = {
            "byVariable": {
                "Count_Person": {
                    "byEntity": {
                        "country/USA": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550201",
                                    "observations": [
                                        {"date": "1900", "value": 76094000},
                                        {"date": "1901", "value": 77584000}
                                    ]
                                }
                            ]
                        },
                        "country/CAN": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550201",
                                    "observations": [
                                        {"date": "1901", "value": 5500000}
                                    ]
                                }
                            ]
                        }
                    }
                },
                "Count_Household": {
                    "byEntity": {
                        "country/USA": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550202",
                                    "observations": [
                                        {"date": "1900", "value": 15000000},
                                        {"date": "1901", "value": 15500000}
                                    ]
                                }
                            ]
                        },
                        "country/CAN": {
                            "orderedFacets": [
                                {
                                    "facetId": "2176550202",
                                    "observations": [
                                        {"date": "1900", "value": 1000000},
                                    ]
                                }
                            ]
                        }
                    }
                }
            },
            "facets": {
                '2176550201': {"importName": "facet1"},
                '2176550202': {"importName": "facet2"}
            }
        }

        entities = ["country/USA", "country/CAN"]
        variables = ["Count_Person", "Count_Household"]
        expected_output = {
            'datesByVariable': [
                {
                    'variable': 'Count_Household',
                    'observationDates': [
                        {
                            'date': '1900',
                            'entityCount': [
                                {
                                    'facet': '2176550202',
                                    'count': 2
                                }
                            ]
                        },
                        {
                            'date': '1901',
                            'entityCount': [
                                {
                                    'facet': '2176550202',
                                    'count': 1
                                }
                            ]
                        }
                    ]
                },
                {
                    'variable': 'Count_Person',
                    'observationDates': [
                        {
                            'date': '1900',
                            'entityCount': [
                                {
                                    'facet': '2176550201',
                                    'count': 1
                                }
                            ]
                        },
                        {
                            'date': '1901',
                            'entityCount': [
                                {
                                    'facet': '2176550201',
                                    'count': 2
                                }
                            ]
                        }
                    ]
                }
            ],
            'facets': {
                '2176550201': {"importName": "facet1"},
                '2176550202': {"importName": "facet2"}
            }
        }

        result = lib_util.get_series_dates_from_entities(entities, variables)
        self.assertEqual(result, expected_output)
