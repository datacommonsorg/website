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
"""Tests for variable extension functions."""

import unittest
from unittest.mock import patch

from server import create_app
from server.lib.nl.common import variable


class TestVariableExtension(unittest.TestCase):

  def setUp(self):
    self.app = create_app()
    self.app_context = self.app.app_context()
    self.app_context.push()

  def tearDown(self):
    self.app_context.pop()

  @patch('server.lib.fetch.property_values')
  @patch('server.services.datacommons.get_variable_group_info')
  def test_extend_svs(self, mock_get_variable_group_info, mock_property_values):
    sv = "Count_Person_BelowPovertyLevelInThePast12Months_Female"

    # Mock property_values to return the group for the SV
    mock_property_values.return_value = {sv: ["dc/g/Person_PovertyStatus"]}

    # Mock get_variable_group_info to return children with definitions
    mock_get_variable_group_info.return_value = {
        "data": [{
            "node": "dc/g/Person_PovertyStatus",
            "info": {
                "childStatVars": [{
                    "id":
                        sv,
                    "definition":
                        "pt=Person,mp=povertyStatus,st=count,gender=Female"
                }, {
                    "id":
                        "Count_Person_BelowPovertyLevelInThePast12Months_Male",
                    "definition":
                        "pt=Person,mp=povertyStatus,st=count,gender=Male"
                }]
            }
        }]
    }

    res = variable.extend_svs([sv])

    # Expected result: should include both the original and the sibling
    # Main SV comes first, then others sorted.
    expected = [sv, "Count_Person_BelowPovertyLevelInThePast12Months_Male"]
    self.assertEqual(res[sv], expected)

  @patch('server.lib.nl.common.variable.parse_svg')
  @patch('server.lib.fetch.property_values')
  @patch('server.services.datacommons.get_variable_group_info')
  def test_extend_svs_indirect_siblings(self, mock_get_variable_group_info,
                                        mock_property_values, mock_parse_svg):
    # To trigger the indirect sibling traversal, the SVG properties must match the SV properties.
    # The SV definition has 1 extra property ('gender'). We mock parse_svg to also return 1 property.
    mock_parse_svg.return_value.pvs = {'dummy_prop': 'dummy_value'}

    sv = "Count_Person_BelowPovertyLevelInThePast12Months_Female"
    sibling_sv = "Count_Person_BelowPovertyLevelInThePast12Months_Male"

    # We use more specific SVGs to trigger len(svg_obj.pvs) == len(sv_obj.pvs)
    svg = "dc/g/Person_PovertyStatus_Female"
    parent_svg = "dc/g/Person_PovertyStatus"
    sibling_svg = "dc/g/Person_PovertyStatus_Male"

    # Property values side effect to handle the multi-stage traversal
    def property_values_side_effect(nodes, prop, out=True):
      if prop == "memberOf" and out:
        # Initial direct group lookup
        return {sv: [svg]}
      elif prop == "specializationOf" and out:
        # Batch 1: Fetch parents
        return {svg: [parent_svg]}
      elif prop == "specializationOf" and not out:
        # Batch 2: Fetch siblings for all parents
        return {parent_svg: [svg, sibling_svg]}
      return {}

    mock_property_values.side_effect = property_values_side_effect

    # Group info side effect to handle direct and sibling group requests
    # We now return definitions directly in the mock response!
    def group_info_side_effect(nodes, _, **kwargs):
      data = []
      if svg in nodes:
        data.append({
            "node": svg,
            "info": {
                "childStatVars": [{
                    "id":
                        sv,
                    "definition":
                        "pt=Person,mp=povertyStatus,st=count,gender=Female"
                }]
            }
        })
      if sibling_svg in nodes:
        data.append({
            "node": sibling_svg,
            "info": {
                "childStatVars": [{
                    "id":
                        sibling_sv,
                    "definition":
                        "pt=Person,mp=povertyStatus,st=count,gender=Male"
                }]
            }
        })
      return {"data": data}

    mock_get_variable_group_info.side_effect = group_info_side_effect

    res = variable.extend_svs([sv])

    # Expected result: should successfully traverse parent -> sibling SVG -> sibling SV
    expected = [sv, sibling_sv]
    self.assertEqual(res[sv], expected)


if __name__ == '__main__':
  unittest.main()
