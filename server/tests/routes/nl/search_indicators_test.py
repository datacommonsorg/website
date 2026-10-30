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
                "typeOf": {
                    "nodes": [{
                        "dcid": "StatisticalVariable"
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
                "typeOf": {
                    "nodes": [{
                        "dcid": "StatisticalVariable"
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
  def test_search_indicators_full_flow(self, mock_v2node,
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
        "/api/nl/search-indicators?queries=population+of+california&index=medium_ft"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Check that the correct external calls were made
    mock_nl_search_vars_in_parallel.assert_called_once_with(
        ["population of california"], ["medium_ft"], skip_topics=False)

    # Check v2node call.
    self.assertEqual(mock_v2node.call_count, 1)
    v2node_call_args, _ = mock_v2node.call_args
    self.assertCountEqual(v2node_call_args[0], ["SV_1", "SV_2"])
    self.assertEqual(v2node_call_args[1], "->[name,description,typeOf]")
    # Check the final response structure and content
    self.assertIn("queryResults", data)
    self.assertEqual(len(data["queryResults"]), 1)
    query_result = data["queryResults"][0]
    self.assertEqual(query_result["query"], "population of california")
    self.assertEqual(len(query_result["indexResults"]), 1)
    index_result = query_result["indexResults"][0]
    self.assertEqual(index_result["index"], "medium_ft")
    self.assertEqual(index_result["defaultThreshold"], 0.75)
    candidates = index_result["results"]
    self.assertEqual(len(candidates), 2)

    # Check SV_1 (passes all filters)
    sv1 = candidates[0]
    self.assertEqual(sv1["dcid"], "SV_1")
    self.assertEqual(sv1["name"], "SV1 Name")
    self.assertAlmostEqual(sv1["score"], 0.9)
    self.assertEqual(sv1["search_descriptions"],
                     ["population of", "number of people in"])

    # Check SV_2 (passes all filters)
    sv2 = candidates[1]
    self.assertEqual(sv2["dcid"], "SV_2")
    self.assertEqual(sv2["name"], "SV2 Name")
    self.assertAlmostEqual(sv2["score"], 0.8)
    self.assertEqual(sv2["search_descriptions"], ["california population"])

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
                      "typeOf": {
                          "nodes": [{
                              "dcid": "StatisticalVariable"
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
                      "typeOf": {
                          "nodes": [{
                              "dcid": "StatisticalVariable"
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
                      "typeOf": {
                          "nodes": [{
                              "dcid": "Topic"
                          }]
                      },
                  }
              },
          }
      }

      response = self.app.get(
          "/api/nl/search-indicators?queries=population+of+california&threshold=0.6&index=medium_ft"
      )
      self.assertEqual(response.status_code, 200)
      data = json.loads(response.data)

      query_result = data["queryResults"][0]
      index_result = query_result["indexResults"][0]
      candidates = index_result["results"]
      self.assertEqual(len(candidates), 3)
      sv3 = candidates[2]
      self.assertEqual(sv3["dcid"], "SV_3")
      self.assertEqual(sv3["name"], "SV3 Name")
      self.assertEqual(sv3["typeOf"], "Topic")
      self.assertAlmostEqual(sv3["score"], 0.7)
      self.assertEqual(sv3["search_descriptions"], ["residents of the state"])

      self.assertEqual(data["responseMetadata"]["thresholdOverride"], 0.6)

  def test_missing_queries_param(self):
    # Test that a 400 error is returned if `queries` is missing.
    response = self.app.get("/api/nl/search-indicators")
    self.assertEqual(response.status_code, 400)

  def test_invalid_threshold_param(self):
    # Test that a 400 error is returned if `threshold` is not a float.
    response = self.app.get(
        "/api/nl/search-indicators?queries=population+of+california&threshold=notafloat"
    )
    self.assertEqual(response.status_code, 400)

  def test_invalid_max_candidates_param(self):
    # Test that a 400 error is returned if `limit_per_index` is not an int.
    response = self.app.get(
        "/api/nl/search-indicators?queries=population+of+california&limit_per_index=notanint"
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
          "/api/nl/search-indicators?queries=population+of+california")
      self.assertEqual(response.status_code, 200)

      # Assert that nl_search_vars_in_parallel was called with the default index
      mock_nl_search_vars_in_parallel.assert_called_once_with(
          ["population of california"], ["default_index_1"], skip_topics=False)

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  def test_max_candidates(self, mock_nl_search_vars_in_parallel):
    # Test that `limit_per_index` correctly truncates the results.
    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": MOCK_NL_SEARCH_VARS_RESPONSE
    }
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
                      "typeOf": {
                          "nodes": [{
                              "dcid": "StatisticalVariable"
                          }]
                      }
                  }
              },
              "SV_2": {
                  "arcs": {
                      "name": {
                          "nodes": [{
                              "value": "SV2 Name"
                          }]
                      },
                      "typeOf": {
                          "nodes": [{
                              "dcid": "StatisticalVariable"
                          }]
                      }
                  }
              }
          }
      }
      response = self.app.get(
          "/api/nl/search-indicators?queries=population+of+california&threshold=0.6&limit_per_index=1&index=medium_ft"
      )
      self.assertEqual(response.status_code, 200)
      data = json.loads(response.data)
      query_result = data["queryResults"][0]
      index_result = query_result["indexResults"][0]
      candidates = index_result["results"]
      self.assertEqual(len(candidates), 1)
      self.assertEqual(candidates[0]["dcid"], "SV_1")

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
        f"/api/nl/search-indicators?queries={query}&index=medium_ft")
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Expect an empty queryResults list
    self.assertEqual(data["queryResults"][0]["indexResults"][0]["results"], [])

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
        "data": {
            "SV_A": {
                "arcs": {
                    "name": {
                        "nodes": [{
                            "value": "SV A"
                        }]
                    }
                }
            },
            "SV_B": {
                "arcs": {
                    "name": {
                        "nodes": [{
                            "value": "SV B"
                        }]
                    }
                }
            },
        }
    }

    response = self.app.get(
        "/api/nl/search-indicators?queries=query1&queries=query2&index=index1&index=index2"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    # Check that the nested dictionary structure is correct
    self.assertEqual(len(data["queryResults"]), 2)
    query1_result = next(
        qr for qr in data["queryResults"] if qr["query"] == "query1")
    self.assertEqual(len(query1_result["indexResults"]), 2)
    index1_for_q1 = next(
        ir for ir in query1_result["indexResults"] if ir["index"] == "index1")
    self.assertEqual(len(index1_for_q1["results"]), 1)
    self.assertEqual(index1_for_q1["results"][0]["dcid"], "SV_A")
    index2_for_q1 = next(
        ir for ir in query1_result["indexResults"] if ir["index"] == "index2")
    self.assertEqual(len(index2_for_q1["results"]), 0)

    query2_result = next(
        qr for qr in data["queryResults"] if qr["query"] == "query2")
    self.assertEqual(len(query2_result["indexResults"]), 2)
    index1_for_q2 = next(
        ir for ir in query2_result["indexResults"] if ir["index"] == "index1")
    self.assertEqual(len(index1_for_q2["results"]), 0)
    index2_for_q2 = next(
        ir for ir in query2_result["indexResults"] if ir["index"] == "index2")
    self.assertEqual(len(index2_for_q2["results"]), 1)
    self.assertEqual(index2_for_q2["results"][0]["dcid"], "SV_B")

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
                    },
                    "typeOf": {
                        "nodes": [{
                            "dcid": "StatisticalVariable"
                        }]
                    },
                }
            }
        }
    }

    response = self.app.get(
        "/api/nl/search-indicators?queries=some+query&index=medium_ft&include_types=StatisticalVariable"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    mock_nl_search_vars_in_parallel.assert_called_once_with(["some query"],
                                                            ["medium_ft"],
                                                            skip_topics=True)

    query_result = data["queryResults"][0]
    index_result = query_result["indexResults"][0]
    candidates = index_result["results"]
    self.assertEqual(len(candidates), 1)
    self.assertEqual(candidates[0]["dcid"], "SV_REGULAR")

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
                    "typeOf": {
                        "nodes": [{
                            "dcid": "StatisticalVariable"
                        }]
                    },
                }
            }
        }
    }

    response = self.app.get(
        "/api/nl/search-indicators?queries=population+of+california&index=medium_ft"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    query_result = data["queryResults"][0]
    index_result = query_result["indexResults"][0]
    candidates = index_result["results"]
    self.assertEqual(len(candidates), 2)

    # SV_1 is fully enriched
    sv1 = candidates[0]
    self.assertEqual(sv1["dcid"], "SV_1")
    self.assertEqual(sv1["name"], "SV1 Name")
    self.assertEqual(sv1["description"], "SV1 Description")

    # SV_2 is not enriched, so name and description should be null
    sv2 = candidates[1]
    self.assertEqual(sv2["dcid"], "SV_2")
    self.assertIsNone(sv2["name"])
    self.assertIsNone(sv2["description"])

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.v2node")
  def test_include_types_filter(self, mock_v2node,
                                mock_nl_search_vars_in_parallel):
    # Test that `include_types` correctly filters the results.
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
    mock_v2node.return_value = {
        "data": {
            "SV_REGULAR": {
                "arcs": {
                    "name": {
                        "nodes": [{
                            "value": "Regular SV"
                        }]
                    },
                    "typeOf": {
                        "nodes": [{
                            "dcid": "StatisticalVariable"
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
                    },
                    "typeOf": {
                        "nodes": [{
                            "dcid": "Topic"
                        }]
                    }
                }
            },
        }
    }

    response = self.app.get(
        "/api/nl/search-indicators?queries=some+query&index=medium_ft&include_types=StatisticalVariable"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    query_result = data["queryResults"][0]
    index_result = query_result["indexResults"][0]
    candidates = index_result["results"]
    self.assertEqual(len(candidates), 1)
    self.assertEqual(candidates[0]["dcid"], "SV_REGULAR")
    self.assertEqual(candidates[0]["typeOf"], "StatisticalVariable")

  @patch("server.services.datacommons.nl_search_vars_in_parallel")
  @patch("server.services.datacommons.v2node")
  def test_empty_v2node_response(self, mock_v2node,
                                 mock_nl_search_vars_in_parallel):
    # Test graceful handling of an empty v2node response.
    mock_nl_search_vars_in_parallel.return_value = {
        "medium_ft": MOCK_NL_SEARCH_VARS_RESPONSE
    }
    mock_v2node.return_value = {"data": {}}  # Empty enrichment data

    response = self.app.get(
        "/api/nl/search-indicators?queries=population+of+california&index=medium_ft"
    )
    self.assertEqual(response.status_code, 200)
    data = json.loads(response.data)

    query_result = data["queryResults"][0]
    index_result = query_result["indexResults"][0]
    candidates = index_result["results"]
    self.assertEqual(len(candidates), 2)

    # Check that indicators are still present but without enrichment
    sv1 = candidates[0]
    self.assertEqual(sv1["dcid"], "SV_1")
    self.assertIsNone(sv1["name"])
    self.assertIsNone(sv1["description"])
    self.assertIsNone(sv1["typeOf"])

    sv2 = candidates[1]
    self.assertEqual(sv2["dcid"], "SV_2")
    self.assertIsNone(sv2["name"])
    self.assertIsNone(sv2["description"])
    self.assertIsNone(sv2["typeOf"])
