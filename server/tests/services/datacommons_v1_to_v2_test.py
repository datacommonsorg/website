# Copyright 2026 Google LLC
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

import collections
import unittest
from unittest import mock

import server.services.datacommons as dc


class TestV1ToV2Migration(unittest.TestCase):

  @mock.patch('server.services.datacommons.post')
  def test_get_place_info(self, mock_post):
    # Mock responses for v2node calls
    # First call: get info for geoId/06
    # Second call: get info for parent country/USA

    def side_effect(url, req, *args, **kwargs):
      if "v2/node" in url:
        nodes = req.get("nodes", [])
        if "geoId/06" in nodes:
          return {
              "data": {
                  "geoId/06": {
                      "properties": {
                          "name": ["California"]
                      },
                      "arcs": {
                          "typeOf": {
                              "nodes": [{
                                  "dcid": "State"
                              }]
                          },
                          "containedInPlace": {
                              "nodes": [{
                                  "dcid": "country/USA"
                              }]
                          }
                      }
                  }
              }
          }
        if "country/USA" in nodes:
          return {
              "data": {
                  "country/USA": {
                      "properties": {
                          "name": ["United States"]
                      },
                      "arcs": {
                          "typeOf": {
                              "nodes": [{
                                  "dcid": "Country"
                              }]
                          }
                      }
                  }
              }
          }
      return {}

    mock_post.side_effect = side_effect

    result = dc.get_place_info(["geoId/06"])

    expected = {
        "data": [{
            "node": "geoId/06",
            "info": {
                "self": {
                    "name": "California",
                    "type": "State"
                },
                "parents": [{
                    "dcid": "country/USA",
                    "name": "United States",
                    "type": "Country"
                }]
            }
        }]
    }

    self.assertEqual(result, expected)

  @mock.patch('server.services.datacommons.post')
  def test_get_series_dates(self, mock_post):
    # Mock response for v2/observation based on real API response
    v2_resp = {
        "byVariable": {
            "Count_Person": {
                "byEntity": {
                    "geoId/06077": {
                        "orderedFacets": [{
                            "facetId": "2176550201",
                            "observations": [{
                                "date": "2024",
                                "value": 816108
                            }]
                        }, {
                            "facetId": "1145703171",
                            "observations": [{
                                "date": "2023",
                                "value": 787416
                            }]
                        }]
                    },
                    "geoId/06039": {
                        "orderedFacets": [{
                            "facetId": "2176550201",
                            "observations": [{
                                "date": "2024",
                                "value": 165432
                            }]
                        }, {
                            "facetId": "1145703171",
                            "observations": [{
                                "date": "2023",
                                "value": 158790
                            }]
                        }]
                    }
                }
            }
        },
        "facets": {
            "2176550201": {
                "importName":
                    "USCensusPEP_Annual_Population",
                "measurementMethod":
                    "CensusPEPSurvey",
                "observationPeriod":
                    "P1Y",
                "provenanceUrl":
                    "https://www.census.gov/programs-surveys/popest.html"
            },
            "1145703171": {
                "importName":
                    "CensusACS5YearSurvey",
                "measurementMethod":
                    "CensusACS5yrSurvey",
                "provenanceUrl":
                    "https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html"
            }
        }
    }

    mock_post.return_value = v2_resp

    result = dc.get_series_dates("geoId/06", "County", ["Count_Person"])

    # We expect aggregated counts
    # 2023: 2 entities (06077, 06039) for facet 1145703171
    # 2024: 2 entities (06077, 06039) for facet 2176550201

    expected = {
        "datesByVariable": [{
            "variable":
                "Count_Person",
            "observationDates": [{
                "date": "2023",
                "entityCount": [{
                    "facet": "1145703171",
                    "count": 2
                }]
            }, {
                "date": "2024",
                "entityCount": [{
                    "facet": "2176550201",
                    "count": 2
                }]
            }]
        }],
        "facets": v2_resp["facets"]
    }

    self.assertEqual(result, expected)
