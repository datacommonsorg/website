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

TEST_DATASET_DCID = "dc/d/UsCensusBureau_AmericanCommunitySurveyAcs"


class TestCroissantMetadata(unittest.TestCase):

  @patch('server.lib.croissant_metadata.dc.v2node')
  def test_missing_properties_handled_gracefully(self, mock_v2node):

    # Empty node data, no name/desc/license/source
    mock_v2node.return_value = {"data": {TEST_DATASET_DCID: {"arcs": {}}}}

    result = build_dataset_metadata(TEST_DATASET_DCID)

    self.assertEqual(result, {})

  @patch('server.lib.croissant_metadata.fetch.multiple_property_values')
  @patch('server.lib.croissant_metadata.fetch.property_values')
  @patch('server.lib.croissant_metadata.dc.v2node')
  def test_success(self, mock_v2node, mock_property_values,
                   mock_multiple_property_values):
    # Test a perfect flow with all metadata present
    mock_property_values.return_value = {"SomeSource": ["https://example.com"]}
    mock_multiple_property_values.return_value = {
        "Prov1": {
            "provenanceCategory": ["StatisticsProvenance"],
            "lastDataRefreshDate": ["2024-05-01"],
            "url": ["https://prov.example.com"]
        }
    }

    def mock_v2node_side_effect(dcids, prop):
      if prop == "->[name,description,license,isPartOf]":
        return {
            "data": {
                TEST_DATASET_DCID: {
                    "arcs": {
                        "name": {
                            "nodes": [{
                                "value": "DatasetName"
                            }]
                        },
                        "description": {
                            "nodes": [{
                                "value":
                                    "This is a very long dataset description that exceeds fifty characters to pass validation."
                            }]
                        },
                        "license": {
                            "nodes": [{
                                "value": "CC-BY"
                            }]
                        },
                        "isPartOf": {
                            "nodes": [{
                                "dcid": "SomeSource",
                                "name": "SourceName"
                            }]
                        }
                    }
                }
            }
        }
      if prop == "<-isPartOf":
        return {
            "data": {
                TEST_DATASET_DCID: {
                    "arcs": {
                        "isPartOf": {
                            "nodes": [{
                                "dcid": "Prov1",
                                "name": "Provenance 1"
                            }]
                        }
                    }
                }
            }
        }
      return {}

    mock_v2node.side_effect = mock_v2node_side_effect

    result = build_dataset_metadata(TEST_DATASET_DCID)

    self.assertEqual(result.get("@type"), "Dataset")
    self.assertEqual(result.get("name"), "DatasetName")
    self.assertEqual(
        result.get("description"),
        "This is a very long dataset description that exceeds fifty characters to pass validation."
    )
    self.assertEqual(result.get("license"), "CC-BY")
    self.assertEqual(result.get("creator")[0].get("name"), "SourceName")
    self.assertEqual(result.get("creator")[0].get("url"), "https://example.com")
    self.assertEqual(result.get("url"),
                     f"https://datacommons.org/browser/{TEST_DATASET_DCID}")
    self.assertEqual(
        result.get("publisher"), {
            "@type": "Organization",
            "name": "Data Commons",
            "url": "https://datacommons.org"
        })
    self.assertIn("@context", result)
    self.assertEqual(result.get("conformsTo"),
                     "http://mlcommons.org/croissant/1.1")
    self.assertEqual(result.get("datePublished"), "2024-05-01")

  @patch('server.lib.croissant_metadata.fetch.multiple_property_values')
  @patch('server.lib.croissant_metadata.fetch.property_values')
  @patch('server.lib.croissant_metadata.dc.v2node')
  def test_success_extended(self, mock_v2node, mock_property_values,
                            mock_multiple_property_values):
    # Test a perfect flow with extended_enabled=True
    mock_property_values.return_value = {"SomeSource": ["https://example.com"]}
    mock_multiple_property_values.return_value = {
        "Prov1": {
            "provenanceCategory": ["StatisticsProvenance"],
            "lastDataRefreshDate": ["2024-05-01"],
            "url": ["https://prov.example.com"],
            "downloadUrl": ["https://prov.example.com/data.csv"]
        }
    }

    def mock_v2node_side_effect(dcids, prop):
      if prop == "->[name,description,license,isPartOf]":
        return {
            "data": {
                TEST_DATASET_DCID: {
                    "arcs": {
                        "name": {
                            "nodes": [{
                                "value": "DatasetName"
                            }]
                        },
                        "description": {
                            "nodes": [{
                                "value":
                                    "This is a very long dataset description that exceeds fifty characters to pass validation."
                            }]
                        },
                        "license": {
                            "nodes": [{
                                "value": "CC-BY"
                            }]
                        },
                        "isPartOf": {
                            "nodes": [{
                                "dcid": "SomeSource",
                                "name": "SourceName"
                            }]
                        }
                    }
                }
            }
        }
      if prop == "<-isPartOf":
        return {
            "data": {
                TEST_DATASET_DCID: {
                    "arcs": {
                        "isPartOf": {
                            "nodes": [{
                                "dcid": "Prov1",
                                "name": "Provenance1"
                            }]
                        }
                    }
                }
            }
        }
      return {}

    mock_v2node.side_effect = mock_v2node_side_effect

    result = build_dataset_metadata(TEST_DATASET_DCID, True)

    self.assertEqual(result.get("@type"), "Dataset")
    self.assertEqual(result.get("datePublished"), "2024-05-01")
    self.assertEqual(len(result.get("distribution", [])), 1)
    self.assertEqual(len(result.get("recordSet", [])), 1)

    file_obj = result.get("distribution")[0]
    self.assertEqual(file_obj.get("@type"), "cr:FileObject")
    self.assertEqual(file_obj.get("@id"), "Provenance1")
    self.assertEqual(file_obj.get("name"), "Provenance1")
    self.assertEqual(file_obj.get("contentUrl"),
                     "https://prov.example.com/data.csv")

    record_set = result.get("recordSet")[0]
    self.assertEqual(record_set.get("@type"), "cr:RecordSet")
    self.assertEqual(record_set.get("@id"), "Provenance1-records")
    self.assertEqual(len(record_set.get("field", [])), 9)

  @patch('server.lib.croissant_metadata.dc.v2node')
  def test_api_exception(self, mock_v2node):
    # Test that exceptions during data fetching are handled by returning {}

    mock_v2node.side_effect = ValueError("API Error")

    result = build_dataset_metadata(TEST_DATASET_DCID)

    self.assertEqual(result, {})
