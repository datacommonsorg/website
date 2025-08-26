# Copyright 2025 Google LLC
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

import json
import unittest
from unittest.mock import patch

from web_app import app

# Mock data for dc.nl_search_vars
MOCK_NL_SEARCH_VARS_RESPONSE = {
    "queryResults": {
        "population of california": {
            "SV": ["SV_1", "SV_2", "SV_3"],
            "CosineScore": [0.9, 0.8, 0.7],
            "SV_to_Sentences": {
                "SV_1": [
                    {
                        "sentence": "population of",
                        "score": 0.9
                    },
                    {
                        "sentence": "number of people in",
                        "score": 0.85
                    },
                ],
                "SV_2": [{
                    "sentence": "california population",
                    "score": 0.8
                }],
                "SV_3": [{
                    "sentence": "residents of the state",
                    "score": 0.7
                }],
            },
        }
    },
    "scoreThreshold": 0.75,
}

# Mock data for dc.filter_statvars
MOCK_FILTER_STATVARS_RESPONSE = {
    "statVars": [{
        "dcid": "SV_1"
    }, {
        "dcid": "SV_2"
    }]
}

# Mock data for dc.v2node
MOCK_V2NODE_RESPONSE = {
    "data": {
        "SV_1": {
            "arcs": {
                "name": {
                    "nodes": [{
                        "value": "SV1 Name"
                    }]
                },
                "description": {
                    "nodes": [{
                        "value": "SV1 Description"
                    }]
                },
            }
        },
        "SV_2": {
            "arcs": {
                "name": {
                    "nodes": [{
                        "value": "SV2 Name"
                    }]
                },
                "description": {
                    "nodes": [{
                        "value": "SV2 Description"
                    }]
                },
            }
        },
    }
}


class TestSearchVariables(unittest.TestCase):

  def setUp(self):
    self.app = app.test_client()

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.filter_statvars")
  @patch("server.services.datacommons.v2node")
  def test_search_variables_full_flow(self, mock_v2node, mock_filter_statvars,
                                      mock_nl_search_vars_in_parallel):
    # This test covers the main success path:
    # 1. NL search returns 3 SVs.
    # 2. Thresholding (using model's 0.75) keeps SV_1 and SV_2.
    # 3. Place filtering (mocked) keeps SV_1 and SV_2.
    # 4. Variable info is fetched for the remaining SVs.
    # 5. Final response is correctly formatted.

    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": MOCK_NL_SEARCH_VARS_RESPONSE
    }
    mock_filter_statvars.return_value = MOCK_FILTER_STATVARS_RESPONSE
    mock_v2node.return_value = MOCK_V2NODE_RESPONSE

    response = self.app.get(
        "/api/nl/search-variables?queries=population+of+california&place_dcids=geoId/06&index=medium_ft"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Check that the correct external calls were made
    mock_nl_search_vars_in_parallel.assert_called_once_with(
        ["population of california"], ["medium_ft"], skip_topics="")

    # Check filter_statvars call. The list of SVs comes from a set, so
    # order is not guaranteed.
    self.assertEqual(mock_filter_statvars.call_count, 1)
    filter_call_args, _ = mock_filter_statvars.call_args
    self.assertCountEqual(filter_call_args[0], [{
        "dcid": "SV_1"
    }, {
        "dcid": "SV_2"
    }])
    self.assertEqual(filter_call_args[1], ["geoId/06"])

    # Check v2node call.
    self.assertEqual(mock_v2node.call_count, 1)
    v2node_call_args, _ = mock_v2node.call_args
    self.assertCountEqual(v2node_call_args[0], ["SV_1", "SV_2"])
    self.assertEqual(v2node_call_args[1], "->[name,description]")
    # Check the final response structure and content
    self.assertIn("queryResults", data)
    index_response = data["queryResults"]["population of california"][
        "medium_ft"]
    self.assertEqual(index_response["modelThreshold"], 0.75)
    variables = index_response["variables"]
    self.assertEqual(len(variables), 2)

    # Check SV_1 (passes all filters)
    self.assertEqual(variables[0]["dcid"], "SV_1")
    self.assertEqual(variables[0]["name"], "SV1 Name")
    self.assertEqual(len(variables[0]["scores"]), 2)
    self.assertEqual(variables[0]["scores"][0]["score"], 0.9)  # Sorted

    # Check SV_2 (passes all filters)
    self.assertEqual(variables[1]["dcid"], "SV_2")
    self.assertEqual(variables[1]["name"], "SV2 Name")
    self.assertEqual(len(variables[1]["scores"]), 1)

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  def test_threshold_override(self, mock_nl_search_vars_in_parallel):
    # This test ensures the `threshold` parameter overrides the model's default.
    # Here, the override (0.6) is lower, so SV_3 should also be included.

    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": MOCK_NL_SEARCH_VARS_RESPONSE
    }

    # Mock v2node to return info for all 3 SVs
    with patch("server.services.datacommons.v2node") as mock_v2node:
      mock_v2node.return_value = {
          "data": {
              "SV_1": {
                  "arcs": {
                      "name": {
                          "nodes": [{
                              "value": "SV1 Name"
                          }]
                      },
                      "description": {
                          "nodes": [{
                              "value": "SV1 Description"
                          }]
                      },
                  }
              },
              "SV_2": {
                  "arcs": {
                      "name": {
                          "nodes": [{
                              "value": "SV2 Name"
                          }]
                      },
                      "description": {
                          "nodes": [{
                              "value": "SV2 Description"
                          }]
                      },
                  }
              },
              "SV_3": {
                  "arcs": {
                      "name": {
                          "nodes": [{
                              "value": "SV3 Name"
                          }]
                      },
                      "description": {
                          "nodes": [{
                              "value": "SV3 Description"
                          }]
                      },
                  }
              },
          }
      }

      response = self.app.get(
          "/api/nl/search-variables?queries=population+of+california&threshold=0.6&index=medium_ft"
      )
      self.assertEqual(response.status_code, 200)
      data = json.loads(response.data)

      index_response = data["queryResults"]["population of california"][
          "medium_ft"]
      variables = index_response["variables"]
      self.assertEqual(len(variables), 3)
      self.assertEqual(variables[2]["dcid"], "SV_3")
      self.assertEqual(data["responseMetadata"]["thresholdOverride"], 0.6)

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.filter_statvars")
  def test_place_filtering_logic(self, mock_filter_statvars,
                                 mock_nl_search_vars_in_parallel):
    # This test ensures the place filter correctly removes an SV.
    # SV_2 will pass the score threshold but be removed by the place filter.

    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": MOCK_NL_SEARCH_VARS_RESPONSE
    }
    # Mock filter_statvars to only return SV_1
    mock_filter_statvars.return_value = {"statVars": [{"dcid": "SV_1"}]}

    with patch("server.services.datacommons.v2node") as mock_v2node:
      mock_v2node.return_value = {
          "data": {
              "SV_1": {
                  "arcs": {
                      "name": {
                          "nodes": [{
                              "value": "SV1 Name"
                          }]
                      },
                      "description": {
                          "nodes": [{
                              "value": "SV1 Description"
                          }]
                      },
                  }
              }
          }
      }

      response = self.app.get(
          "/api/nl/search-variables?queries=population+of+california&place_dcids=geoId/06&index=medium_ft"
      )
      self.assertEqual(response.status_code, 200)
      data = json.loads(response.data)

      index_response = data["queryResults"]["population of california"][
          "medium_ft"]
      variables = index_response["variables"]
      self.assertEqual(len(variables), 1)
      self.assertEqual(variables[0]["dcid"], "SV_1")

  def test_missing_queries_param(self):
    # Test that a 400 error is returned if `queries` is missing.
    response = self.app.get("/api/nl/search-variables")
    self.assertEqual(response.status_code, 400)

  @patch("server.services.datacommons.nl_server_config")
  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  def test_default_index_usage(self, mock_nl_search_vars_in_parallel,
                               mock_nl_server_config):
    # Test that if no index is provided, the default from nl_server_config is used.
    mock_nl_server_config.return_value = {
        "default_indexes": ["default_index_1"]
    }
    mock_nl_search_vars_in_parallel.return_value = {
        "default_index_1": MOCK_NL_SEARCH_VARS_RESPONSE
    }

    with patch("server.services.datacommons.v2node"):
      response = self.app.get(
          "/api/nl/search-variables?queries=population+of+california")
      self.assertEqual(response.status_code, 200)

      # Assert that nl_search_vars_in_parallel was called with the default index
      mock_nl_search_vars_in_parallel.assert_called_once_with(
          ["population of california"], ["default_index_1"], skip_topics="")

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  def test_max_candidates(self, mock_nl_search_vars_in_parallel):
    # Test that `max_candidates_per_index` correctly truncates the results.
    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": MOCK_NL_SEARCH_VARS_RESPONSE
    }
    with patch("server.services.datacommons.v2node"):
      response = self.app.get(
          "/api/nl/search-variables?queries=population+of+california&threshold=0.6&max_candidates_per_index=1&index=medium_ft"
      )
      self.assertEqual(response.status_code, 200)
      data = json.loads(response.data)
      index_response = data["queryResults"]["population of california"][
          "medium_ft"]
      variables = index_response["variables"]
      # Even though 3 SVs pass the threshold, only 1 should be returned.
      self.assertEqual(len(variables), 1)
      self.assertEqual(variables[0]["dcid"], "SV_1")

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  def test_empty_nl_response(self, mock_nl_search_vars_in_parallel):
    # Test that if the NL server returns no results, the endpoint handles
    # it gracefully.
    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": {
            "queryResults": {}
        }
    }

    response = self.app.get(
        "/api/nl/search-variables?queries=a+query+with+no+results&index=medium_ft"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Expect an empty queryResults dictionary
    self.assertEqual(data["queryResults"], {})

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.filter_statvars")
  @patch("server.services.datacommons.v2node")
  def test_multiple_queries_and_indices(self, mock_v2node, mock_filter_statvars,
                                        mock_nl_search_vars_in_parallel):
    # This test ensures that multiple queries and indices are handled correctly
    # in the same request.

    # Mock responses for two different indices
    mock_nl_search_vars_in_parallel.return_value = {
        "index1": {
            "queryResults": {
                "query1": {
                    "SV": ["SV_A"],
                    "SV_to_Sentences": {
                        "SV_A": [{
                            "sentence": "sentence a",
                            "score": 0.9
                        }]
                    },
                }
            },
            "scoreThreshold": 0.8,
        },
        "index2": {
            "queryResults": {
                "query2": {
                    "SV": ["SV_B"],
                    "SV_to_Sentences": {
                        "SV_B": [{
                            "sentence": "sentence b",
                            "score": 0.9
                        }]
                    },
                }
            },
            "scoreThreshold": 0.8,
        },
    }
    mock_filter_statvars.return_value = {
        "statVars": [{
            "dcid": "SV_A"
        }, {
            "dcid": "SV_B"
        }]
    }
    mock_v2node.return_value = {
        "data": {}
    }  # Assume no extra info for simplicity

    response = self.app.get(
        "/api/nl/search-variables?queries=query1&queries=query2&index=index1&index=index2"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Check that the nested dictionary structure is correct
    self.assertIn("query1", data["queryResults"])
    self.assertIn("index1", data["queryResults"]["query1"])
    self.assertEqual(
        data["queryResults"]["query1"]["index1"]["variables"][0]["dcid"],
        "SV_A")

    self.assertIn("query2", data["queryResults"])
    self.assertIn("index2", data["queryResults"]["query2"])
    self.assertEqual(
        data["queryResults"]["query2"]["index2"]["variables"][0]["dcid"],
        "SV_B")

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.filter_statvars")
  @patch("server.services.datacommons.v2node")
  def test_topic_separation_and_filtering(self, mock_v2node,
                                          mock_filter_statvars,
                                          mock_nl_search_vars_in_parallel):
    # This test ensures that topic SVs are separated and bypass the place filter.
    mock_nl_response = {
        "queryResults": {
            "some query": {
                "SV": ["SV_REGULAR", "dc/topic/MyTopic"],
                "SV_to_Sentences": {
                    "SV_REGULAR": [{
                        "sentence": "regular sv sentence",
                        "score": 0.9
                    }],
                    "dc/topic/MyTopic": [{
                        "sentence": "topic sentence",
                        "score": 0.9
                    }],
                },
            }
        },
        "scoreThreshold": 0.8,
    }
    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": mock_nl_response
    }

    # filter_statvars should only be called with the regular SV and should keep it.
    mock_filter_statvars.return_value = {"statVars": [{"dcid": "SV_REGULAR"}]}

    # v2node should be called for both the regular SV and the topic.
    mock_v2node.return_value = {
        "data": {
            "SV_REGULAR": {
                "arcs": {
                    "name": {
                        "nodes": [{
                            "value": "Regular SV"
                        }]
                    }
                }
            },
            "dc/topic/MyTopic": {
                "arcs": {
                    "name": {
                        "nodes": [{
                            "value": "My Topic"
                        }]
                    }
                }
            },
        }
    }

    response = self.app.get(
        "/api/nl/search-variables?queries=some+query&place_dcids=geoId/06&index=medium_ft"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Assert that filter_statvars was only called with the regular SV.
    mock_filter_statvars.assert_called_once_with([{
        "dcid": "SV_REGULAR"
    }], ["geoId/06"])

    # Assert that v2node was called with both.
    self.assertEqual(mock_v2node.call_count, 1)
    v2node_call_args, _ = mock_v2node.call_args
    self.assertCountEqual(v2node_call_args[0],
                          ["SV_REGULAR", "dc/topic/MyTopic"])

    # Check the final response structure.
    index_response = data["queryResults"]["some query"]["medium_ft"]
    self.assertEqual(len(index_response["variables"]), 1)
    self.assertEqual(index_response["variables"][0]["dcid"], "SV_REGULAR")
    self.assertEqual(len(index_response["topics"]), 1)
    self.assertEqual(index_response["topics"][0]["dcid"], "dc/topic/MyTopic")
