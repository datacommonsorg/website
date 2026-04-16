import unittest
from unittest.mock import patch

from server.services import datacommons as dc


class TestMigrationVerification(unittest.TestCase):

  @patch('server.services.datacommons.post')
  def test_get_place_info_v2(self, mock_post):
    # Setup
    dcids = ["geoId/06"]

    # Mock V2 responses for ancestors, types, and names
    # Mock side_effect to handle these calls
    def side_effect(url, data, api_key=None, log_extreme_calls=False):
      prop = data.get("property", "")

      # Ancestors call (BFS uses ->containedInPlace)
      if "->containedInPlace" in prop:
        # Mock returning USA as parent of California
        resp_data = {}
        nodes = data.get("nodes", [])
        for node in nodes:
          if node == "geoId/06":
            resp_data[node] = {
                "arcs": {
                    "containedInPlace": {
                        "nodes": [{
                            "dcid": "country/USA"
                        }]
                    }
                }
            }
          # no parent for country/USA result in empty dict or just no entry
        return {"data": resp_data}

      # Key property call (types or name)
      if "nodes" in data and len(data["nodes"]) > 0:
        nodes = data["nodes"]
        if "typeOf" in prop:
          return {
              "data": {
                  "country/USA": {
                      "arcs": {
                          "typeOf": {
                              "nodes": [{
                                  "dcid": "Country"
                              }]
                          }
                      }
                  },
                  "geoId/06": {
                      "arcs": {
                          "typeOf": {
                              "nodes": [{
                                  "dcid": "State"
                              }]
                          }
                      }
                  }
              }
          }
        if "name" in prop:
          return {
              "data": {
                  "country/USA": {
                      "arcs": {
                          "name": {
                              "nodes": [{
                                  "value": "United States"
                              }]
                          }
                      }
                  },
                  "geoId/06": {
                      "arcs": {
                          "name": {
                              "nodes": [{
                                  "value": "California"
                              }]
                          }
                      }
                  }
              }
          }
      return {}

    mock_post.side_effect = side_effect

    # Execute
    result = dc.get_place_info(dcids)

    # Verify
    expected_parents = [{
        "dcid": "country/USA",
        "type": "Country",
        "name": "United States"
    }]

    self.assertIn("data", result)
    self.assertEqual(len(result["data"]), 1)
    item = result["data"][0]
    self.assertEqual(item["node"], "geoId/06")
    self.assertIn("info", item)
    self.assertEqual(item["info"]["self"]["dcid"], "geoId/06")
    self.assertEqual(item["info"]["self"]["type"], "State")
    self.assertEqual(item["info"]["self"]["name"], "California")

    # Verify parents are sorted
    self.assertEqual(item["info"]["parents"], expected_parents)

  @patch('server.services.datacommons.post')
  def test_get_series_dates_v2(self, mock_post):
    # Setup
    parent_entity = "geoId/06"
    child_type = "County"
    variables = ["Count_Person"]

    def side_effect(url, data, api_key=None, log_extreme_calls=False):
      # Recursive child nodes with type filter
      if "<-containedInPlace+{" in data.get("property", ""):
        return {
            "data": {
                "geoId/06": {
                    "arcs": {
                        "containedInPlace+": {
                            "nodes": [{
                                "dcid": "geoId/06001",
                                "name": "Alameda County",
                                "types": ["County"]
                            }, {
                                "dcid": "geoId/06085",
                                "name": "Santa Clara County",
                                "types": ["County"]
                            }]
                        }
                    }
                }
            }
        }
      # Observations
      if "variable" in data and "entity" in data:
        return {
            "byVariable": {
                "Count_Person": {
                    "byEntity": {
                        "geoId/06001": {
                            "orderedFacets": [{
                                "facetId": "1",
                                "observations": [{
                                    "date": "2020",
                                    "value": 100
                                }]
                            }]
                        },
                        "geoId/06085": {
                            "orderedFacets": [{
                                "facetId":
                                    "1",
                                "observations": [{
                                    "date": "2020",
                                    "value": 200
                                }, {
                                    "date": "2021",
                                    "value": 210
                                }]
                            }]
                        }
                    }
                }
            }
        }
      return {}

    mock_post.side_effect = side_effect

    # Execute
    result = dc.get_series_dates(parent_entity, child_type, variables)

    # Verify
    self.assertIn("datesByVariable", result)
    self.assertEqual(len(result["datesByVariable"]), 1)
    var_data = result["datesByVariable"][0]
    self.assertEqual(var_data["variable"], "Count_Person")

    dates = {d["date"]: d for d in var_data["observationDates"]}
    self.assertIn("2020", dates)
    self.assertEqual(dates["2020"]["entityCount"][0]["count"], 2)

    self.assertIn("2021", dates)
    self.assertEqual(dates["2021"]["entityCount"][0]["count"], 1)

  @patch('server.services.datacommons.post')
  def test_get_place_info_edge_cases(self, mock_post):
    """Test recursion limits, cycles, and missing data for get_place_info."""

    # Scenario 1: Max Recursion Depth (Chain > 10 levels)
    # We expect it to stop at level 10.
    def recursion_side_effect(url, data, api_key=None, log_extreme_calls=False):
      if "->containedInPlace" in data.get("property", ""):
        # Expect 'nodes' in payload
        nodes = data.get("nodes", [])
        resp_data = {}
        for node in nodes:
          if node.startswith("node"):
            try:
              idx = int(node[4:])
              if idx < 15:  # Create chain up to 15
                parent = f"node{idx+1}"
                resp_data[node] = {
                    "arcs": {
                        "containedInPlace": {
                            "nodes": [{
                                "dcid": parent
                            }]
                        }
                    }
                }
            except ValueError:
              pass
        return {"data": resp_data}

      # For types/names, return dummy data
      if "nodes" in data:
        resp_data = {}
        for node in data["nodes"]:
          resp_data[node] = {
              "arcs": {
                  "typeOf": {
                      "nodes": [{
                          "dcid": "Place"
                      }]
                  },
                  "name": {
                      "nodes": [{
                          "value": f"Name {node}"
                      }]
                  }
              }
          }
        return {"data": resp_data}
      return {}

    mock_post.side_effect = recursion_side_effect

    # Test max depth
    dcids = ["node0"]
    result = dc.get_place_info(dcids)

    self.assertIn("data", result)
    item = result["data"][0]
    # We expect parents to contain node1..node10 (10 levels)
    self.assertEqual(len(item["info"]["parents"]), 10)
    parent_dcids = [p["dcid"] for p in item["info"]["parents"]]
    self.assertIn("node10", parent_dcids)
    self.assertNotIn("node11", parent_dcids)

  @patch('server.services.datacommons.post')
  def test_get_place_info_cycle(self, mock_post):
    """Test handling of cycles in parent graph (A -> B -> A)."""

    def cycle_side_effect(url, data, api_key=None, log_extreme_calls=False):
      if "->containedInPlace" in data.get("property", ""):
        nodes = data.get("nodes", [])
        resp_data = {}
        for node in nodes:
          if node == "nodeA":
            resp_data[node] = {
                "arcs": {
                    "containedInPlace": {
                        "nodes": [{
                            "dcid": "nodeB"
                        }]
                    }
                }
            }
          elif node == "nodeB":
            resp_data[node] = {
                "arcs": {
                    "containedInPlace": {
                        "nodes": [{
                            "dcid": "nodeA"
                        }]
                    }
                }
            }
        return {"data": resp_data}
      # names/types
      return {
          "data": {
              "nodeA": {
                  "arcs": {
                      "typeOf": {
                          "nodes": [{
                              "dcid": "Place"
                          }]
                      },
                      "name": {
                          "nodes": [{
                              "value": "A"
                          }]
                      }
                  }
              },
              "nodeB": {
                  "arcs": {
                      "typeOf": {
                          "nodes": [{
                              "dcid": "Place"
                          }]
                      },
                      "name": {
                          "nodes": [{
                              "value": "B"
                          }]
                      }
                  }
              }
          }
      }

    mock_post.side_effect = cycle_side_effect

    dcids = ["nodeA"]
    result = dc.get_place_info(dcids)

    # Should not hang or crash
    item = result["data"][0]
    parents = item["info"]["parents"]
    # nodeA's parents should include nodeB.
    self.assertEqual(len(parents), 1)
    self.assertEqual(parents[0]["dcid"], "nodeB")

  @patch('server.services.datacommons.post')
  def test_get_series_dates_error(self, mock_post):
    """Test error handling (e.g. 500 from API)."""
    mock_post.side_effect = Exception("API Error")

    with self.assertRaises(Exception):
      dc.get_series_dates("geoId/06", "County", ["Var1"])
