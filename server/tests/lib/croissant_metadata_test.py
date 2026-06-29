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

import unittest
from unittest.mock import patch

from server.lib.croissant_metadata import build_dataset_metadata


class TestCroissantMetadata(unittest.TestCase):

  @patch('server.lib.croissant_metadata.fetch.property_values')
  def test_not_a_provenance(self, mock_property_values):
    # Test that if a node is not a Provenance node (e.g. it's a Country), it instantly returns {}
    mock_property_values.return_value = {"dc/base/FakeNode": ["Country"]}
    result = build_dataset_metadata("dc/base/FakeNode")
    self.assertEqual(result, {})

  @patch('server.lib.croissant_metadata.feature_flags_lib.is_feature_enabled')
  @patch('server.lib.croissant_metadata.fetch.property_values')
  def test_feature_flag_disabled(self, mock_property_values,
                                 mock_is_feature_enabled):
    # Test that if the croissant feature flag is off, it returns {}
    mock_property_values.return_value = {
        "dc/base/ACSED5YrSurvey": ["Provenance"]
    }
    mock_is_feature_enabled.return_value = False
    result = build_dataset_metadata("dc/base/ACSED5YrSurvey")
    self.assertEqual(result, {})

  @patch('server.lib.croissant_metadata.dc.v2node')
  @patch('server.lib.croissant_metadata.feature_flags_lib.is_feature_enabled')
  @patch('server.lib.croissant_metadata.fetch.property_values')
  def test_invalid_provenance_category(self, mock_property_values,
                                       mock_is_feature_enabled, mock_v2node):
    # Test that if the provenanceCategory is not StatisticsProvenance or AggregatedStatisticsProvenance, it returns {}
    mock_property_values.return_value = {
        "dc/base/ACSED5YrSurvey": ["Provenance"]
    }
    mock_is_feature_enabled.return_value = True

    mock_v2node.return_value = {
        "data": {
            "dc/base/ACSED5YrSurvey": {
                "arcs": {
                    # Provide an INVALID category here
                    "provenanceCategory": {
                        "nodes": [{
                            "dcid": "SomeRandomCategory"
                        }]
                    },
                }
            }
        }
    }

    result = build_dataset_metadata("dc/base/ACSED5YrSurvey")
    self.assertEqual(result, {})

  @patch('server.lib.croissant_metadata.dc.v2node')
  @patch('server.lib.croissant_metadata.feature_flags_lib.is_feature_enabled')
  @patch('server.lib.croissant_metadata.fetch.property_values')
  def test_missing_property_fail_fast(self, mock_property_values,
                                      mock_is_feature_enabled, mock_v2node):
    # Test the "fail fast" logic: if it's missing a required property (like description), it returns {}
    mock_property_values.return_value = {
        "dc/base/ACSED5YrSurvey": ["Provenance"]
    }
    mock_is_feature_enabled.return_value = True

    # Missing description
    mock_v2node.return_value = {
        "data": {
            "dc/base/ACSED5YrSurvey": {
                "arcs": {
                    "provenanceCategory": {
                        "nodes": [{
                            "dcid": "StatisticsProvenance"
                        }]
                    },
                    "isPartOf": {
                        "nodes": [{
                            "dcid": "SomeDataset",
                            "name": "Some Dataset Name"
                        }]
                    },
                    # description is intentionally missing
                    "license": {
                        "nodes": [{
                            "value": "CC-BY"
                        }]
                    },
                    "source": {
                        "nodes": [{
                            "dcid": "SomeSource",
                            "name": "Some Source Name"
                        }]
                    }
                }
            }
        }
    }

    result = build_dataset_metadata("dc/base/ACSED5YrSurvey")
    self.assertEqual(result, {})

  @patch('server.lib.croissant_metadata.dc.v2node')
  @patch('server.lib.croissant_metadata.feature_flags_lib.is_feature_enabled')
  @patch('server.lib.croissant_metadata.fetch.property_values')
  def test_success(self, mock_property_values, mock_is_feature_enabled,
                   mock_v2node):
    # Test a perfect flow with all metadata present
    mock_property_values.return_value = {
        "dc/base/ACSED5YrSurvey": ["Provenance"]
    }
    mock_is_feature_enabled.return_value = True

    # We need side_effect because the function calls v2node twice (once for node data, once for source URL)
    def mock_v2node_side_effect(dcids, prop):
      if prop == "->[provenanceCategory,isPartOf,description,license,source]":
        return {
            "data": {
                "dc/base/ACSED5YrSurvey": {
                    "arcs": {
                        "provenanceCategory": {
                            "nodes": [{
                                "dcid": "StatisticsProvenance"
                            }]
                        },
                        "isPartOf": {
                            "nodes": [{
                                "dcid": "SomeDataset",
                                "name": "DatasetName"
                            }]
                        },
                        "description": {
                            "nodes": [{
                                "value": "Dataset Description"
                            }]
                        },
                        "license": {
                            "nodes": [{
                                "value": "CC-BY"
                            }]
                        },
                        "source": {
                            "nodes": [{
                                "dcid": "SomeSource",
                                "name": "SourceName"
                            }]
                        }
                    }
                }
            }
        }
      if prop == "->url":
        return {
            "data": {
                "SomeSource": {
                    "arcs": {
                        "url": {
                            "nodes": [{
                                "value": "https://example.com"
                            }]
                        }
                    }
                }
            }
        }
      return {}

    mock_v2node.side_effect = mock_v2node_side_effect

    result = build_dataset_metadata("dc/base/ACSED5YrSurvey")

    self.assertEqual(result.get("@type"), "Dataset")
    self.assertEqual(result.get("name"), "DatasetName")
    self.assertEqual(result.get("description"), "Dataset Description")
    self.assertEqual(result.get("license"), "CC-BY")
    self.assertEqual(result.get("creator")[0].get("name"), "SourceName")
    self.assertEqual(result.get("creator")[0].get("url"), "https://example.com")
    self.assertEqual(result.get("url"),
                     "https://datacommons.org/browser/dc/base/ACSED5YrSurvey")
