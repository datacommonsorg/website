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
                        "orderedFacets": [{
                            "facetId":
                                "2176550201",
                            "observations": [{
                                "date": "1900",
                                "value": 76094000
                            }, {
                                "date": "1901",
                                "value": 77584000
                            }]
                        }]
                    }
                }
            }
        }
    }
    expected_output = [{
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 76094000,
        'variable': 'Count_Person'
    }, {
        'date': '1901',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 77584000,
        'variable': 'Count_Person'
    }]
    self.assertEqual(lib_util.flatten_obs_series_response(obs_series_response),
                     expected_output)

  def test_multiple_variables_single_entity(self):
    obs_series_response = {
        "byVariable": {
            "Count_Person": {
                "byEntity": {
                    "country/USA": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550201",
                            "observations": [{
                                "date": "1900",
                                "value": 76094000
                            }, {
                                "date": "1901",
                                "value": 77584000
                            }]
                        }]
                    }
                }
            },
            "Count_Household": {
                "byEntity": {
                    "country/USA": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550202",
                            "observations": [{
                                "date": "1900",
                                "value": 15000000
                            }, {
                                "date": "1901",
                                "value": 15500000
                            }]
                        }]
                    }
                }
            }
        }
    }
    expected_output = [{
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 76094000,
        'variable': 'Count_Person'
    }, {
        'date': '1901',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 77584000,
        'variable': 'Count_Person'
    }, {
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550202',
        'value': 15000000,
        'variable': 'Count_Household'
    }, {
        'date': '1901',
        'entity': 'country/USA',
        'facet': '2176550202',
        'value': 15500000,
        'variable': 'Count_Household'
    }]
    self.assertEqual(lib_util.flatten_obs_series_response(obs_series_response),
                     expected_output)

  def test_single_variable_multiple_entities(self):
    obs_series_response = {
        "byVariable": {
            "Count_Person": {
                "byEntity": {
                    "country/USA": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550201",
                            "observations": [{
                                "date": "1900",
                                "value": 76094000
                            }, {
                                "date": "1901",
                                "value": 77584000
                            }]
                        }]
                    },
                    "country/CAN": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550203",
                            "observations": [{
                                "date": "1900",
                                "value": 5400000
                            }, {
                                "date": "1901",
                                "value": 5500000
                            }]
                        }]
                    }
                }
            }
        }
    }
    expected_output = [{
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 76094000,
        'variable': 'Count_Person'
    }, {
        'date': '1901',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 77584000,
        'variable': 'Count_Person'
    }, {
        'date': '1900',
        'entity': 'country/CAN',
        'facet': '2176550203',
        'value': 5400000,
        'variable': 'Count_Person'
    }, {
        'date': '1901',
        'entity': 'country/CAN',
        'facet': '2176550203',
        'value': 5500000,
        'variable': 'Count_Person'
    }]
    self.assertEqual(lib_util.flatten_obs_series_response(obs_series_response),
                     expected_output)

  def test_multiple_variables_multiple_entities(self):
    obs_series_response = {
        "byVariable": {
            "Count_Person": {
                "byEntity": {
                    "country/USA": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550201",
                            "observations": [{
                                "date": "1900",
                                "value": 76094000
                            }, {
                                "date": "1901",
                                "value": 77584000
                            }]
                        }]
                    },
                    "country/CAN": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550203",
                            "observations": [{
                                "date": "1900",
                                "value": 5400000
                            }, {
                                "date": "1901",
                                "value": 5500000
                            }]
                        }]
                    }
                }
            },
            "Count_Household": {
                "byEntity": {
                    "country/USA": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550202",
                            "observations": [{
                                "date": "1900",
                                "value": 15000000
                            }, {
                                "date": "1901",
                                "value": 15500000
                            }]
                        }]
                    },
                    "country/CAN": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550204",
                            "observations": [{
                                "date": "1900",
                                "value": 1000000
                            }, {
                                "date": "1901",
                                "value": 1100000
                            }]
                        }]
                    }
                }
            }
        }
    }
    expected_output = [{
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 76094000,
        'variable': 'Count_Person'
    }, {
        'date': '1901',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 77584000,
        'variable': 'Count_Person'
    }, {
        'date': '1900',
        'entity': 'country/CAN',
        'facet': '2176550203',
        'value': 5400000,
        'variable': 'Count_Person'
    }, {
        'date': '1901',
        'entity': 'country/CAN',
        'facet': '2176550203',
        'value': 5500000,
        'variable': 'Count_Person'
    }, {
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550202',
        'value': 15000000,
        'variable': 'Count_Household'
    }, {
        'date': '1901',
        'entity': 'country/USA',
        'facet': '2176550202',
        'value': 15500000,
        'variable': 'Count_Household'
    }, {
        'date': '1900',
        'entity': 'country/CAN',
        'facet': '2176550204',
        'value': 1000000,
        'variable': 'Count_Household'
    }, {
        'date': '1901',
        'entity': 'country/CAN',
        'facet': '2176550204',
        'value': 1100000,
        'variable': 'Count_Household'
    }]
    self.assertEqual(lib_util.flatten_obs_series_response(obs_series_response),
                     expected_output)


class TestFlattenedObservationsToDatesByVariable(unittest.TestCase):

  def test_single_variable_single_date_single_facet(self):
    flattened_observations = [{
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 76094000,
        'variable': 'Count_Person'
    }]
    expected_output = [{
        'variable':
            'Count_Person',
        'observationDates': [{
            'date': '1900',
            'entityCount': [{
                'facet': '2176550201',
                'count': 1
            }]
        }]
    }]
    self.assertEqual(
        lib_util.flattened_observations_to_dates_by_variable(
            flattened_observations), expected_output)

  def test_single_variable_multiple_dates_single_facet(self):
    flattened_observations = [{
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 76094000,
        'variable': 'Count_Person'
    }, {
        'date': '1901',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 77584000,
        'variable': 'Count_Person'
    }]
    expected_output = [{
        'variable':
            'Count_Person',
        'observationDates': [{
            'date': '1900',
            'entityCount': [{
                'facet': '2176550201',
                'count': 1
            }]
        }, {
            'date': '1901',
            'entityCount': [{
                'facet': '2176550201',
                'count': 1
            }]
        }]
    }]
    self.assertEqual(
        lib_util.flattened_observations_to_dates_by_variable(
            flattened_observations), expected_output)

  def test_multiple_variables_single_date_single_facet(self):
    flattened_observations = [{
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 76094000,
        'variable': 'Count_Person'
    }, {
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550202',
        'value': 15000000,
        'variable': 'Count_Household'
    }]
    expected_output = [{
        'variable':
            'Count_Household',
        'observationDates': [{
            'date': '1900',
            'entityCount': [{
                'facet': '2176550202',
                'count': 1
            }]
        }]
    }, {
        'variable':
            'Count_Person',
        'observationDates': [{
            'date': '1900',
            'entityCount': [{
                'facet': '2176550201',
                'count': 1
            }]
        }]
    }]
    self.assertEqual(
        lib_util.flattened_observations_to_dates_by_variable(
            flattened_observations), expected_output)

  def test_single_variable_single_date_multiple_facets(self):
    flattened_observations = [{
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 76094000,
        'variable': 'Count_Person'
    }, {
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550202',
        'value': 15000000,
        'variable': 'Count_Person'
    }]
    expected_output = [{
        'variable':
            'Count_Person',
        'observationDates': [{
            'date':
                '1900',
            'entityCount': [{
                'facet': '2176550201',
                'count': 1
            }, {
                'facet': '2176550202',
                'count': 1
            }]
        }]
    }]
    self.assertEqual(
        lib_util.flattened_observations_to_dates_by_variable(
            flattened_observations), expected_output)

  def test_multiple_variables_multiple_dates_multiple_facets(self):
    flattened_observations = [{
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 76094000,
        'variable': 'Count_Person'
    }, {
        'date': '1901',
        'entity': 'country/USA',
        'facet': '2176550201',
        'value': 77584000,
        'variable': 'Count_Person'
    }, {
        'date': '1900',
        'entity': 'country/USA',
        'facet': '2176550202',
        'value': 15000000,
        'variable': 'Count_Household'
    }, {
        'date': '1901',
        'entity': 'country/USA',
        'facet': '2176550202',
        'value': 15500000,
        'variable': 'Count_Household'
    }]
    expected_output = [{
        'variable':
            'Count_Household',
        'observationDates': [{
            'date': '1900',
            'entityCount': [{
                'facet': '2176550202',
                'count': 1
            }]
        }, {
            'date': '1901',
            'entityCount': [{
                'facet': '2176550202',
                'count': 1
            }]
        }]
    }, {
        'variable':
            'Count_Person',
        'observationDates': [{
            'date': '1900',
            'entityCount': [{
                'facet': '2176550201',
                'count': 1
            }]
        }, {
            'date': '1901',
            'entityCount': [{
                'facet': '2176550201',
                'count': 1
            }]
        }]
    }]
    self.assertEqual(
        lib_util.flattened_observations_to_dates_by_variable(
            flattened_observations), expected_output)


class TestGetSeriesDatesFromEntities(unittest.TestCase):
  maxDiff = None

  @patch('server.services.datacommons.obs_series')
  def test_single_variable_single_entity(self, mock_obs_series):
    mock_obs_series.return_value = {
        "byVariable": {
            "Count_Person": {
                "byEntity": {
                    "country/USA": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550201",
                            "observations": [{
                                "date": "1900",
                                "value": 76094000
                            }, {
                                "date": "1901",
                                "value": 77584000
                            }]
                        }]
                    }
                }
            }
        },
        "facets": {
            "2176550201": {
                "importName": "facet1"
            }
        }
    }

    entities = ["country/USA"]
    variables = ["Count_Person"]
    expected_output = {
        'datesByVariable': [{
            'variable':
                'Count_Person',
            'observationDates': [{
                'date': '1900',
                'entityCount': [{
                    'facet': '2176550201',
                    'count': 1
                }]
            }, {
                'date': '1901',
                'entityCount': [{
                    'facet': '2176550201',
                    'count': 1
                }]
            }]
        }],
        'facets': {
            '2176550201': {
                "importName": "facet1"
            }
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
                        "orderedFacets": [{
                            "facetId":
                                "2176550201",
                            "observations": [{
                                "date": "1900",
                                "value": 76094000
                            }, {
                                "date": "1901",
                                "value": 77584000
                            }]
                        }]
                    },
                    "country/CAN": {
                        "orderedFacets": [{
                            "facetId": "2176550201",
                            "observations": [{
                                "date": "1901",
                                "value": 5500000
                            }]
                        }]
                    }
                }
            },
            "Count_Household": {
                "byEntity": {
                    "country/USA": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550202",
                            "observations": [{
                                "date": "1900",
                                "value": 15000000
                            }, {
                                "date": "1901",
                                "value": 15500000
                            }]
                        }]
                    },
                    "country/CAN": {
                        "orderedFacets": [{
                            "facetId":
                                "2176550202",
                            "observations": [{
                                "date": "1900",
                                "value": 1000000
                            },]
                        }]
                    }
                }
            }
        },
        "facets": {
            '2176550201': {
                "importName": "facet1"
            },
            '2176550202': {
                "importName": "facet2"
            }
        }
    }

    entities = ["country/USA", "country/CAN"]
    variables = ["Count_Person", "Count_Household"]
    expected_output = {
        'datesByVariable': [{
            'variable':
                'Count_Household',
            'observationDates': [{
                'date': '1900',
                'entityCount': [{
                    'facet': '2176550202',
                    'count': 2
                }]
            }, {
                'date': '1901',
                'entityCount': [{
                    'facet': '2176550202',
                    'count': 1
                }]
            }]
        }, {
            'variable':
                'Count_Person',
            'observationDates': [{
                'date': '1900',
                'entityCount': [{
                    'facet': '2176550201',
                    'count': 1
                }]
            }, {
                'date': '1901',
                'entityCount': [{
                    'facet': '2176550201',
                    'count': 2
                }]
            }]
        }],
        'facets': {
            '2176550201': {
                "importName": "facet1"
            },
            '2176550202': {
                "importName": "facet2"
            }
        }
    }

    result = lib_util.get_series_dates_from_entities(entities, variables)
    self.assertEqual(result, expected_output)


class TestFetchHighestCoverage(unittest.TestCase):

  mock_obs_series_labor_force_response = {
      "byVariable": {
          "Count_Person_InLaborForce": {
              "byEntity": {
                  "country/RUS": {
                      "orderedFacets": [{
                          "facetId": "461514461",
                          "observations": [{
                              "date": "2014",
                              "value": 75425759
                          }, {
                              "date": "2015",
                              "value": 75122849
                          }, {
                              "date": "2016",
                              "value": 75182854
                          }, {
                              "date": "2017",
                              "value": 74610600
                          }, {
                              "date": "2018",
                              "value": 74501321
                          }, {
                              "date": "2019",
                              "value": 73598523
                          }, {
                              "date": "2020",
                              "value": 73064922
                          }, {
                              "date": "2021",
                              "value": 73716244
                          }],
                          "obsCount": 32,
                          "earliestDate": "1990",
                          "latestDate": "2021"
                      }]
                  },
                  "country/USA": {
                      "orderedFacets": [{
                          "facetId": "3707913853",
                          "observations": [{
                              "date": "2020-11",
                              "value": 160627000
                          }, {
                              "date": "2020-12",
                              "value": 160761000
                          }, {
                              "date": "2021-01",
                              "value": 160014000
                          }, {
                              "date": "2021-02",
                              "value": 160133000
                          }, {
                              "date": "2021-03",
                              "value": 160395000
                          }, {
                              "date": "2021-04",
                              "value": 160884000
                          }, {
                              "date": "2021-05",
                              "value": 160737000
                          }, {
                              "date": "2021-06",
                              "value": 161294000
                          }, {
                              "date": "2021-07",
                              "value": 161558000
                          }, {
                              "date": "2021-08",
                              "value": 161558000
                          }, {
                              "date": "2021-09",
                              "value": 161568000
                          }, {
                              "date": "2021-10",
                              "value": 161748000
                          }, {
                              "date": "2021-11",
                              "value": 162241000
                          }, {
                              "date": "2021-12",
                              "value": 162429000
                          }, {
                              "date": "2022-01",
                              "value": 163615000
                          }, {
                              "date": "2022-02",
                              "value": 163807000
                          }, {
                              "date": "2022-03",
                              "value": 164212000
                          }, {
                              "date": "2022-04",
                              "value": 163922000
                          }, {
                              "date": "2022-05",
                              "value": 164280000
                          }, {
                              "date": "2022-06",
                              "value": 164100000
                          }, {
                              "date": "2022-07",
                              "value": 164065000
                          }, {
                              "date": "2022-08",
                              "value": 164741000
                          }, {
                              "date": "2022-09",
                              "value": 164649000
                          }, {
                              "date": "2022-10",
                              "value": 164679000
                          }, {
                              "date": "2022-11",
                              "value": 164441000
                          }, {
                              "date": "2022-12",
                              "value": 164998000
                          }, {
                              "date": "2023-01",
                              "value": 165871000
                          }, {
                              "date": "2023-02",
                              "value": 166263000
                          }, {
                              "date": "2023-03",
                              "value": 166690000
                          }, {
                              "date": "2023-04",
                              "value": 166678000
                          }, {
                              "date": "2023-05",
                              "value": 166823000
                          }, {
                              "date": "2023-06",
                              "value": 167000000
                          }, {
                              "date": "2023-07",
                              "value": 167113000
                          }, {
                              "date": "2023-08",
                              "value": 167840000
                          }, {
                              "date": "2023-09",
                              "value": 167897000
                          }, {
                              "date": "2023-10",
                              "value": 167723000
                          }, {
                              "date": "2023-11",
                              "value": 168127000
                          }, {
                              "date": "2023-12",
                              "value": 167451000
                          }, {
                              "date": "2024-01",
                              "value": 167276000
                          }, {
                              "date": "2024-02",
                              "value": 167426000
                          }, {
                              "date": "2024-03",
                              "value": 167895000
                          }, {
                              "date": "2024-04",
                              "value": 167982000
                          }, {
                              "date": "2024-05",
                              "value": 167732000
                          }, {
                              "date": "2024-06",
                              "value": 168009000
                          }],
                          "obsCount": 44,
                          "earliestDate": "2020-11",
                          "latestDate": "2024-06"
                      }, {
                          "facetId": "1714978719",
                          "observations": [{
                              "date": "2018-09",
                              "value": 162030000
                          }, {
                              "date": "2018-12",
                              "value": 162881000
                          }, {
                              "date": "2019-03",
                              "value": 162955000
                          }, {
                              "date": "2019-06",
                              "value": 162835000
                          }, {
                              "date": "2019-09",
                              "value": 163818000
                          }, {
                              "date": "2019-12",
                              "value": 164537000
                          }, {
                              "date": "2020-03",
                              "value": 163774000
                          }, {
                              "date": "2020-06",
                              "value": 158115000
                          }, {
                              "date": "2020-09",
                              "value": 160395000
                          }, {
                              "date": "2020-12",
                              "value": 160783000
                          }, {
                              "date": "2021-03",
                              "value": 160180000
                          }, {
                              "date": "2021-06",
                              "value": 160971000
                          }, {
                              "date": "2021-09",
                              "value": 161561000
                          }, {
                              "date": "2021-12",
                              "value": 162139000
                          }, {
                              "date": "2022-03",
                              "value": 163878000
                          }, {
                              "date": "2022-06",
                              "value": 164101000
                          }, {
                              "date": "2022-09",
                              "value": 164485000
                          }, {
                              "date": "2022-12",
                              "value": 164706000
                          }, {
                              "date": "2023-03",
                              "value": 166275000
                          }, {
                              "date": "2023-06",
                              "value": 166834000
                          }, {
                              "date": "2023-09",
                              "value": 167617000
                          }, {
                              "date": "2023-12",
                              "value": 167767000
                          }, {
                              "date": "2024-03",
                              "value": 167532000
                          }, {
                              "date": "2024-06",
                              "value": 167908000
                          }],
                          "obsCount": 24,
                          "earliestDate": "2018-09",
                          "latestDate": "2024-06"
                      }, {
                          "facetId": "461514461",
                          "observations": [{
                              "date": "2015",
                              "value": 160644681
                          }, {
                              "date": "2016",
                              "value": 162448669
                          }, {
                              "date": "2017",
                              "value": 163971527
                          }, {
                              "date": "2018",
                              "value": 165307010
                          }, {
                              "date": "2019",
                              "value": 167100511
                          }, {
                              "date": "2020",
                              "value": 165641653
                          }, {
                              "date": "2021",
                              "value": 166189867
                          }, {
                              "date": "2022",
                              "value": 169229171
                          }],
                          "obsCount": 8,
                          "earliestDate": "2015",
                          "latestDate": "2022"
                      }, {
                          "facetId": "10983471",
                          "observations": [{
                              "date": "2015",
                              "value": 160027973.833
                          }, {
                              "date": "2016",
                              "value": 160860555.215
                          }, {
                              "date": "2017",
                              "value": 162175736.728
                          }, {
                              "date": "2018",
                              "value": 163158833.976
                          }, {
                              "date": "2019",
                              "value": 164626265.92
                          }, {
                              "date": "2020",
                              "value": 165886019.482
                          }, {
                              "date": "2021",
                              "value": 167959740.312
                          }, {
                              "date": "2022",
                              "value": 169171602.855
                          }],
                          "obsCount": 8,
                          "earliestDate": "2015",
                          "latestDate": "2022"
                      }, {
                          "facetId": "196790193",
                          "observations": [{
                              "date": "2017",
                              "value": 162175736.728
                          }, {
                              "date": "2018",
                              "value": 163158833.976
                          }, {
                              "date": "2019",
                              "value": 164626265.92
                          }, {
                              "date": "2020",
                              "value": 165886019.482
                          }, {
                              "date": "2021",
                              "value": 167959740.312
                          }],
                          "obsCount": 5,
                          "earliestDate": "2017",
                          "latestDate": "2021"
                      }, {
                          "facetId": "217147238",
                          "observations": [{
                              "date": "2017",
                              "value": 162175736.728
                          }, {
                              "date": "2018",
                              "value": 163158833.976
                          }, {
                              "date": "2019",
                              "value": 164626265.92
                          }, {
                              "date": "2020",
                              "value": 165886019.482
                          }, {
                              "date": "2021",
                              "value": 167959740.312
                          }],
                          "obsCount": 5,
                          "earliestDate": "2017",
                          "latestDate": "2021"
                      }]
                  },
                  "country/MEX": {
                      "orderedFacets": [{
                          "facetId": "461514461",
                          "observations": [{
                              "date": "2015",
                              "value": 52690172
                          }, {
                              "date": "2016",
                              "value": 53525389
                          }, {
                              "date": "2017",
                              "value": 54238561
                          }, {
                              "date": "2018",
                              "value": 55360235
                          }, {
                              "date": "2019",
                              "value": 56818605
                          }, {
                              "date": "2020",
                              "value": 53127554
                          }, {
                              "date": "2021",
                              "value": 56993986
                          }, {
                              "date": "2022",
                              "value": 58701105
                          }],
                          "obsCount": 8,
                          "earliestDate": "2015",
                          "latestDate": "2022"
                      }]
                  }
              }
          }
      },
      "facets": {
          "3707913853": {
              "importName": "BLS_CPS",
              "provenanceUrl": "https://www.bls.gov/cps/",
              "measurementMethod": "BLSSeasonallyAdjusted",
              "observationPeriod": "P1M"
          },
          "1714978719": {
              "importName": "BLS_CPS",
              "provenanceUrl": "https://www.bls.gov/cps/",
              "measurementMethod": "BLSSeasonallyAdjusted",
              "observationPeriod": "P3M"
          },
          "10983471": {
              "importName":
                  "CensusACS5YearSurvey_SubjectTables_S2601A",
              "provenanceUrl":
                  "https://data.census.gov/cedsci/table?q=S2601A&tid=ACSST5Y2019.S2601A",
              "measurementMethod":
                  "CensusACS5yrSurveySubjectTable"
          },
          "196790193": {
              "importName":
                  "CensusACS5YearSurvey_SubjectTables_S2602",
              "provenanceUrl":
                  "https://data.census.gov/cedsci/table?q=S2602&tid=ACSST5Y2019.S2602",
              "measurementMethod":
                  "CensusACS5yrSurveySubjectTable"
          },
          "217147238": {
              "importName":
                  "CensusACS5YearSurvey_SubjectTables_S2603",
              "provenanceUrl":
                  "https://data.census.gov/cedsci/table?q=S2603&tid=ACSST5Y2019.S2603",
              "measurementMethod":
                  "CensusACS5yrSurveySubjectTable"
          },
          "461514461": {
              "importName":
                  "WorldDevelopmentIndicators",
              "provenanceUrl":
                  "https://datacatalog.worldbank.org/dataset/world-development-indicators/",
              "measurementMethod":
                  "InternationalLaborOrganization",
              "observationPeriod":
                  "P1Y"
          }
      }
  }

  mock_obs_series_poverty_response = {
      "byVariable": {
          "sdg/SI_POV_DAY1": {
              "byEntity": {
                  "country/USA": {
                      "orderedFacets": [{
                          "facetId": "3549866825",
                          "observations": [{
                              "date": "1974",
                              "value": 0.7
                          }, {
                              "date": "1979",
                              "value": 0.7
                          }, {
                              "date": "1980",
                              "value": 0.5
                          }, {
                              "date": "1981",
                              "value": 0.5
                          }, {
                              "date": "1982",
                              "value": 0.7
                          }, {
                              "date": "1983",
                              "value": 0.7
                          }, {
                              "date": "1984",
                              "value": 0.5
                          }, {
                              "date": "1985",
                              "value": 0.5
                          }, {
                              "date": "1986",
                              "value": 0.5
                          }, {
                              "date": "1987",
                              "value": 0.5
                          }, {
                              "date": "1988",
                              "value": 0.5
                          }, {
                              "date": "1989",
                              "value": 0.5
                          }, {
                              "date": "1990",
                              "value": 0.5
                          }, {
                              "date": "1991",
                              "value": 0.5
                          }, {
                              "date": "1992",
                              "value": 0.5
                          }, {
                              "date": "1993",
                              "value": 0.5
                          }, {
                              "date": "1994",
                              "value": 0.5
                          }, {
                              "date": "1995",
                              "value": 0.5
                          }, {
                              "date": "1996",
                              "value": 0.7
                          }, {
                              "date": "1997",
                              "value": 0.7
                          }, {
                              "date": "1998",
                              "value": 0.7
                          }, {
                              "date": "1999",
                              "value": 0.7
                          }, {
                              "date": "2000",
                              "value": 0.7
                          }, {
                              "date": "2001",
                              "value": 0.7
                          }, {
                              "date": "2002",
                              "value": 0.7
                          }, {
                              "date": "2003",
                              "value": 1
                          }, {
                              "date": "2004",
                              "value": 1
                          }, {
                              "date": "2005",
                              "value": 1
                          }, {
                              "date": "2006",
                              "value": 1
                          }, {
                              "date": "2007",
                              "value": 1
                          }, {
                              "date": "2008",
                              "value": 1
                          }, {
                              "date": "2009",
                              "value": 1
                          }, {
                              "date": "2010",
                              "value": 1
                          }, {
                              "date": "2011",
                              "value": 1
                          }, {
                              "date": "2012",
                              "value": 1
                          }, {
                              "date": "2013",
                              "value": 1
                          }, {
                              "date": "2014",
                              "value": 1.2
                          }, {
                              "date": "2015",
                              "value": 1.2
                          }, {
                              "date": "2016",
                              "value": 1
                          }, {
                              "date": "2017",
                              "value": 1.2
                          }, {
                              "date": "2018",
                              "value": 1
                          }, {
                              "date": "2019",
                              "value": 1
                          }, {
                              "date": "2020",
                              "value": 0.2
                          }],
                          "obsCount": 43,
                          "earliestDate": "1974",
                          "latestDate": "2020"
                      }]
                  },
                  "country/MEX": {
                      "orderedFacets": [{
                          "facetId": "3549866825",
                          "observations": [{
                              "date": "1989",
                              "value": 9.1
                          }, {
                              "date": "1992",
                              "value": 7.4
                          }, {
                              "date": "1994",
                              "value": 7.3
                          }, {
                              "date": "1996",
                              "value": 18.1
                          }, {
                              "date": "1998",
                              "value": 12.9
                          }, {
                              "date": "2000",
                              "value": 8.9
                          }, {
                              "date": "2002",
                              "value": 6.6
                          }, {
                              "date": "2004",
                              "value": 6
                          }, {
                              "date": "2005",
                              "value": 6.5
                          }, {
                              "date": "2006",
                              "value": 4.2
                          }, {
                              "date": "2008",
                              "value": 5.4
                          }, {
                              "date": "2010",
                              "value": 4.5
                          }, {
                              "date": "2012",
                              "value": 3.8
                          }, {
                              "date": "2014",
                              "value": 3.7
                          }, {
                              "date": "2016",
                              "value": 3.2
                          }, {
                              "date": "2018",
                              "value": 2.6
                          }, {
                              "date": "2020",
                              "value": 3.1
                          }],
                          "obsCount": 17,
                          "earliestDate": "1989",
                          "latestDate": "2020"
                      }]
                  },
                  "country/RUS": {
                      "orderedFacets": [{
                          "facetId": "3549866825",
                          "observations": [{
                              "date": "1997",
                              "value": 1.5
                          }, {
                              "date": "1998",
                              "value": 2.3
                          }, {
                              "date": "1999",
                              "value": 4.4
                          }, {
                              "date": "2000",
                              "value": 3
                          }, {
                              "date": "2001",
                              "value": 1.8
                          }, {
                              "date": "2002",
                              "value": 1
                          }, {
                              "date": "2003",
                              "value": 1.1
                          }, {
                              "date": "2004",
                              "value": 1
                          }, {
                              "date": "2005",
                              "value": 0.8
                          }, {
                              "date": "2006",
                              "value": 0.4
                          }, {
                              "date": "2007",
                              "value": 0.2
                          }, {
                              "date": "2008",
                              "value": 0.1
                          }, {
                              "date": "2009",
                              "value": 0.1
                          }, {
                              "date": "2010",
                              "value": 0.1
                          }, {
                              "date": "2011",
                              "value": 0
                          }, {
                              "date": "2012",
                              "value": 0
                          }, {
                              "date": "2013",
                              "value": 0
                          }, {
                              "date": "2014",
                              "value": 0
                          }, {
                              "date": "2015",
                              "value": 0
                          }, {
                              "date": "2016",
                              "value": 0
                          }, {
                              "date": "2017",
                              "value": 0
                          }, {
                              "date": "2018",
                              "value": 0
                          }, {
                              "date": "2019",
                              "value": 0
                          }, {
                              "date": "2020",
                              "value": 0
                          }],
                          "obsCount": 24,
                          "earliestDate": "1997",
                          "latestDate": "2020"
                      }]
                  }
              }
          }
      },
      "facets": {
          "3549866825": {
              "importName": "UN_SDG",
              "provenanceUrl": "https://unstats.un.org/sdgs/dataportal",
              "measurementMethod": "SDG_G_G",
              "unit": "SDG_PERCENT"
          }
      }
  }

  @patch('server.lib.fetch.point_core')
  @patch('server.services.datacommons.obs_series')
  def test_fetch_highest_coverage_with_entities_single_variable(
      self, mock_obs_series, mock_point_core):
    variables = ['Count_Person_InLaborForce']
    entities = ['country/USA', 'country/RUS', 'country/MEX']

    mock_obs_series.return_value = self.mock_obs_series_labor_force_response

    lib_util.fetch_highest_coverage(variables=variables,
                                    all_facets=False,
                                    entities=entities)
    mock_point_core.assert_called_with(entities, variables, '2021', False)

  @patch('server.lib.fetch.point_core')
  @patch('server.services.datacommons.obs_series')
  def test_fetch_highest_coverage_with_entities_multi_variable(
      self, mock_obs_series, mock_point_core):
    variables = ['Count_Person_InLaborForce', 'sdg/SI_POV_DAY1']
    entities = ['country/USA', 'country/RUS', 'country/MEX']
    mock_obs_series_response = {
        "byVariable": {
            **(self.mock_obs_series_labor_force_response["byVariable"]),
            **(self.mock_obs_series_poverty_response["byVariable"])
        },
        "facets": {
            **(self.mock_obs_series_labor_force_response["facets"]),
            **(self.mock_obs_series_poverty_response["facets"])
        }
    }

    mock_obs_series.return_value = mock_obs_series_response

    lib_util.fetch_highest_coverage(variables=variables,
                                    all_facets=False,
                                    entities=entities)
    mock_point_core.assert_called_with(entities, variables, '2020', False)

  @patch('server.lib.fetch.point_within_core')
  @patch('server.services.datacommons.get_series_dates')
  def test_fetch_highest_coverage_with_parent_entity_and_child_type(
      self, mock_get_series_dates, mock_point_within_core):
    variables = ['who/Var1', 'who/Var2']
    parent_entity = 'Earth'
    child_type = 'Country'
    mock_series_dates_response = {
        "datesByVariable": [{
            "observationDates": [
                {
                    "date": "2017",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2018",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2019",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2020",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2021",
                    "entityCount": [{
                        "count": 155,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2022",
                    "entityCount": [{
                        "count": 155,
                        "facet": "820746905"
                    }]
                },
            ],
            "variable": "who/Var1"
        }, {
            "observationDates": [
                {
                    "date": "2017",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2018",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2019",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2020",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2021",
                    "entityCount": [{
                        "count": 155,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2022",
                    "entityCount": [{
                        "count": 155,
                        "facet": "820746905"
                    }]
                },
            ],
            "variable": "who/Var2"
        }],
        "facets": {
            "820746905": {
                "importName": "UN_WHO",
                "provenanceUrl": "https://www.who.int/data"
            }
        }
    }

    mock_get_series_dates.return_value = mock_series_dates_response

    lib_util.fetch_highest_coverage(variables=variables,
                                    all_facets=False,
                                    parent_entity=parent_entity,
                                    child_type=child_type)
    # In this case, 2020 (195 observations) has higher coverage than 2021 and 2022 (155 observations)
    mock_point_within_core.assert_called_with(parent_entity, child_type,
                                              variables, "2020", False, None)

  @patch('server.lib.fetch.point_within_core')
  @patch('server.services.datacommons.get_series_dates')
  def test_fetch_highest_coverage_with_parent_entity_and_child_type_multi_variable(
      self, mock_get_series_dates, mock_point_within_core):
    variables = ['who/Var1', 'who/Var2']
    parent_entity = 'Earth'
    child_type = 'Country'
    mock_series_dates_response = {
        "datesByVariable": [{
            "observationDates": [
                {
                    "date": "2017",
                    "entityCount": [{
                        "count": 10,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2018",
                    "entityCount": [{
                        "count": 10,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2019",
                    "entityCount": [{
                        "count": 155,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2020",
                    "entityCount": [{
                        "count": 10,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2021",
                    "entityCount": [{
                        "count": 10,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2022",
                    "entityCount": [{
                        "count": 10,
                        "facet": "820746905"
                    }]
                },
            ],
            "variable": "who/Var1"
        }, {
            "observationDates": [
                {
                    "date": "2017",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2018",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2019",
                    "entityCount": [{
                        "count": 175,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2020",
                    "entityCount": [{
                        "count": 195,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2021",
                    "entityCount": [{
                        "count": 155,
                        "facet": "820746905"
                    }]
                },
                {
                    "date": "2022",
                    "entityCount": [{
                        "count": 155,
                        "facet": "820746905"
                    }]
                },
            ],
            "variable": "who/Var2"
        }],
        "facets": {
            "820746905": {
                "importName": "UN_WHO",
                "provenanceUrl": "https://www.who.int/data"
            }
        }
    }

    mock_get_series_dates.return_value = mock_series_dates_response

    lib_util.fetch_highest_coverage(variables=variables,
                                    all_facets=False,
                                    parent_entity=parent_entity,
                                    child_type=child_type)
    # In this case 2019 has the highest overall coverage (155 observations for who/Var1 + 175 observations for who/Var2)
    mock_point_within_core.assert_called_with(parent_entity, child_type,
                                              variables, "2019", False, None)

  @patch('server.lib.fetch.point_within_core')
  @patch('server.services.datacommons.get_series_dates')
  def test_fetch_highest_coverage_with_no_observation_dates(
      self, mock_get_series_dates, mock_point_within_core):
    variables = ['who/Var1', 'who/Var2']
    parent_entity = 'Earth'
    child_type = 'Country'
    mock_series_dates_response = {
        "datesByVariable": [{
            "variable": "who/Var1"
        }, {
            "variable": "who/Var2"
        }]
    }

    mock_get_series_dates.return_value = mock_series_dates_response

    expected_output = {
        "data": {
            "who/Var1": {},
            "who/Var2": {}
        },
        "facets": {}
    }

    result = lib_util.fetch_highest_coverage(variables=variables,
                                             all_facets=False,
                                             parent_entity=parent_entity,
                                             child_type=child_type)
    # In this case, there is no highest coverage date, so expect and empty
    # response
    self.assertEqual(result, expected_output)
