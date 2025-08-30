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
  @patch("server.services.datacommons.v2node")
  def test_search_variables_full_flow(self, mock_v2node,
                                      mock_nl_search_vars_in_parallel):
    # This test covers the main success path:
    # 1. NL search returns 3 SVs.
    # 2. Thresholding (using model's 0.75) keeps SV_1 and SV_2.
    # 3. Variable info is fetched for the remaining SVs.
    # 4. Final response is correctly formatted.

    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": MOCK_NL_SEARCH_VARS_RESPONSE
    }
    mock_v2node.return_value = MOCK_V2NODE_RESPONSE

    response = self.app.get(
        "/api/nl/search-variables?queries=population+of+california&index=medium_ft"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Check that the correct external calls were made
    mock_nl_search_vars_in_parallel.assert_called_once_with(
        ["population of california"], ["medium_ft"], skip_topics="")

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
    indicators = index_response["indicators"]
    self.assertEqual(len(indicators), 2)

    # Check SV_1 (passes all filters)
    sv1 = indicators[0]
    self.assertEqual(sv1["dcid"], "SV_1")
    self.assertEqual(sv1["name"], "SV1 Name")
    self.assertEqual(sv1["indicatorType"], "variable")
    self.assertAlmostEqual(sv1["score"], 0.9)
    self.assertEqual(sv1["sentences"], ["population of", "number of people in"])

    # Check SV_2 (passes all filters)
    sv2 = indicators[1]
    self.assertEqual(sv2["dcid"], "SV_2")
    self.assertEqual(sv2["name"], "SV2 Name")
    self.assertEqual(sv2["indicatorType"], "variable")
    self.assertAlmostEqual(sv2["score"], 0.8)
    self.assertEqual(sv2["sentences"], ["california population"])

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
      indicators = index_response["indicators"]
      self.assertEqual(len(indicators), 3)
      sv3 = indicators[2]
      self.assertEqual(sv3["dcid"], "SV_3")
      self.assertEqual(sv3["name"], "SV3 Name")
      self.assertEqual(sv3["indicatorType"], "variable")
      self.assertAlmostEqual(sv3["score"], 0.7)
      self.assertEqual(sv3["sentences"], ["residents of the state"])

      self.assertEqual(data["responseMetadata"]["thresholdOverride"], 0.6)

  def test_missing_queries_param(self):
    # Test that a 400 error is returned if `queries` is missing.
    response = self.app.get("/api/nl/search-variables")
    self.assertEqual(response.status_code, 400)

  def test_invalid_threshold_param(self):
    # Test that a 400 error is returned if `threshold` is not a float.
    response = self.app.get(
        "/api/nl/search-variables?queries=population+of+california&threshold=notafloat"
    )
    self.assertEqual(response.status_code, 400)

  def test_invalid_max_candidates_param(self):
    # Test that a 400 error is returned if `max_candidates_per_index` is not an int.
    response = self.app.get(
        "/api/nl/search-variables?queries=population+of+california&max_candidates_per_index=notanint"
    )
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
      indicators = index_response["indicators"]
      # Even though 3 SVs pass the threshold, only 1 should be returned.
      self.assertEqual(len(indicators), 1)
      self.assertEqual(indicators[0]["dcid"], "SV_1")

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  def test_empty_nl_response(self, mock_nl_search_vars_in_parallel):
    # Test that if the NL server returns no results, the endpoint handles
    # it gracefully.
    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": {
            "queryResults": {}
        }
    }

    query = "a query with no results"
    response = self.app.get(
        f"/api/nl/search-variables?queries={query}&index=medium_ft")
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Expect an empty queryResults dictionary
    self.assertEqual(data["queryResults"], {query: {}})

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.v2node")
  def test_multiple_queries_and_indices(self, mock_v2node,
                                        mock_nl_search_vars_in_parallel):
    # This test ensures that multiple queries and indices are handled correctly
    # in the same request.

    # Mock responses for two different indices
    mock_nl_search_vars_in_parallel.return_value = {
        "index1": {
            "queryResults": {
                "query1": {
                    "SV": ["SV_A"],
                    "CosineScore": [0.9],
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
                    "CosineScore": [0.9],
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
        data["queryResults"]["query1"]["index1"]["indicators"][0]["dcid"],
        "SV_A")

    self.assertIn("query2", data["queryResults"])
    self.assertIn("index2", data["queryResults"]["query2"])
    self.assertEqual(
        data["queryResults"]["query2"]["index2"]["indicators"][0]["dcid"],
        "SV_B")

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.v2node")
  def test_topic_separation(self, mock_v2node, mock_nl_search_vars_in_parallel):
    # This test ensures that topic SVs are separated and handled correctly.
    mock_nl_response = {
        "queryResults": {
            "some query": {
                "SV": ["SV_REGULAR", "dc/topic/MyTopic"],
                "CosineScore": [0.9, 0.9],
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
        "/api/nl/search-variables?queries=some+query&index=medium_ft")
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Check the final response structure.
    index_response = data["queryResults"]["some query"]["medium_ft"]
    indicators = index_response["indicators"]
    self.assertEqual(len(indicators), 2)

    # The order is preserved from the NL API response.
    regular_sv = indicators[0]
    self.assertEqual(regular_sv["dcid"], "SV_REGULAR")
    self.assertEqual(regular_sv["indicatorType"], "variable")
    self.assertEqual(regular_sv["name"], "Regular SV")
    self.assertAlmostEqual(regular_sv["score"], 0.9)
    self.assertEqual(regular_sv["sentences"], ["regular sv sentence"])

    topic_sv = indicators[1]
    self.assertEqual(topic_sv["dcid"], "dc/topic/MyTopic")
    self.assertEqual(topic_sv["indicatorType"], "topic")
    self.assertEqual(topic_sv["name"], "My Topic")
    self.assertAlmostEqual(topic_sv["score"], 0.9)
    self.assertEqual(topic_sv["sentences"], ["topic sentence"])

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.v2node")
  def test_skip_topics(self, mock_v2node, mock_nl_search_vars_in_parallel):
    # Test that when `skip_topics=true`, topics are filtered out.
    mock_nl_response = {
        "queryResults": {
            "some query": {
                "SV": ["SV_REGULAR"],
                "CosineScore": [0.9],
                "SV_to_Sentences": {
                    "SV_REGULAR": [{
                        "sentence": "regular sv sentence",
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
            }
        }
    }

    response = self.app.get(
        "/api/nl/search-variables?queries=some+query&index=medium_ft&skip_topics=true"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    mock_nl_search_vars_in_parallel.assert_called_once_with(["some query"],
                                                            ["medium_ft"],
                                                            skip_topics="true")

    index_response = data["queryResults"]["some query"]["medium_ft"]
    indicators = index_response["indicators"]
    self.assertEqual(len(indicators), 1)
    self.assertEqual(indicators[0]["dcid"], "SV_REGULAR")

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.v2node")
  def test_partial_enrichment(self, mock_v2node,
                              mock_nl_search_vars_in_parallel):
    # Test that if v2node only returns info for some SVs, the others are
    # still included in the response but with null names/descriptions.
    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": MOCK_NL_SEARCH_VARS_RESPONSE
    }
    # v2node response is missing SV_2
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
        "/api/nl/search-variables?queries=population+of+california&index=medium_ft"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    indicators = data["queryResults"]["population of california"]["medium_ft"][
        "indicators"]
    self.assertEqual(len(indicators), 2)

    # SV_1 is fully enriched
    sv1 = indicators[0]
    self.assertEqual(sv1["dcid"], "SV_1")
    self.assertEqual(sv1["name"], "SV1 Name")
    self.assertEqual(sv1["description"], "SV1 Description")

    # SV_2 is not enriched, so name and description should be null
    sv2 = indicators[1]
    self.assertEqual(sv2["dcid"], "SV_2")
    self.assertIsNone(sv2["name"])
    self.assertIsNone(sv2["description"])
