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
    self.assertCountEqual(filter_call_args[0], ["SV_1", "SV_2"])
    self.assertEqual(filter_call_args[1], ["geoId/06"])

    # Check v2node call.
    self.assertEqual(mock_v2node.call_count, 1)
    v2node_call_args, _ = mock_v2node.call_args
    self.assertCountEqual(v2node_call_args[0], ["SV_1", "SV_2"])
    self.assertEqual(v2node_call_args[1], "->name,->description")
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
