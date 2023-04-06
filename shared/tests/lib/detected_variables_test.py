# Copyright 2023 Google LLC
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
"""Tests for variables."""

import unittest

import shared.lib.detected_variables as vars

_MULTI_SV = {
    "Candidates": [{
        "Parts": [{
            "QueryPart":
                "number poor hispanic",
            "SV": [
                "Count_Person_NotHispanicOrLatino",
                "Count_Person_HispanicOrLatino",
                "Count_Person_Male_AbovePovertyLevelInThePast12Months_HispanicOrLatino",
                "Count_Person_AbovePovertyLevelInThePast12Months_HispanicOrLatino",
                "Count_Person_AbovePovertyLevelInThePast12Months_WhiteAloneNotHispanicOrLatino",
                "Count_Person_Male_AbovePovertyLevelInThePast12Months_WhiteAloneNotHispanicOrLatino",
                "Count_Person_Female_BelowPovertyLevelInThePast12Months_HispanicOrLatino",
                "Count_Person_Male_BelowPovertyLevelInThePast12Months_HispanicOrLatino",
                "Count_Person_BelowPovertyLevelInThePast12Months_HispanicOrLatino"
            ],
            "CosineScore": [
                0.7498, 0.7474, 0.7411, 0.7306, 0.7176, 0.71, 0.7095, 0.7093,
                0.7002
            ]
        }, {
            "QueryPart": "women phd",
            "SV": [
                "Count_Person_25OrMoreYears_EducationalAttainmentDoctorateDegree_Female"
            ],
            "CosineScore": [0.9085]
        }],
        "AggCosineScore": 0.8291,
        "DelimBased": True
    }, {
        "Parts": [{
            "QueryPart": "number poor hispanic women",
            "SV": [
                "Count_Person_Female_BelowPovertyLevelInThePast12Months_HispanicOrLatino",
                "Count_Person_Female_HispanicOrLatino",
                "Count_Person_Female_NotHispanicOrLatino"
            ],
            "CosineScore": [0.8227, 0.7895, 0.7874]
        }, {
            "QueryPart": "phd",
            "SV": ["Count_Person_EducationalAttainmentDoctorateDegree"],
            "CosineScore": [0.7767]
        }],
        "AggCosineScore": 0.7997,
        "DelimBased": False
    }, {
        "Parts": [{
            "QueryPart":
                "number poor hispanic",
            "SV": [
                "Count_Person_NotHispanicOrLatino",
                "Count_Person_HispanicOrLatino",
                "Count_Person_Male_AbovePovertyLevelInThePast12Months_HispanicOrLatino",
                "Count_Person_AbovePovertyLevelInThePast12Months_HispanicOrLatino",
                "Count_Person_AbovePovertyLevelInThePast12Months_WhiteAloneNotHispanicOrLatino",
                "Count_Person_Male_AbovePovertyLevelInThePast12Months_WhiteAloneNotHispanicOrLatino",
                "Count_Person_Female_BelowPovertyLevelInThePast12Months_HispanicOrLatino",
                "Count_Person_Male_BelowPovertyLevelInThePast12Months_HispanicOrLatino",
                "Count_Person_BelowPovertyLevelInThePast12Months_HispanicOrLatino"
            ],
            "CosineScore": [
                0.7498, 0.7474, 0.7411, 0.7306, 0.7176, 0.71, 0.7095, 0.7093,
                0.7002
            ]
        }, {
            "QueryPart": "women",
            "SV": ["Count_Person_Female", "dc/topic/MaternalHealth"],
            "CosineScore": [0.6536, 0.6503]
        }, {
            "QueryPart": "phd",
            "SV": ["Count_Person_EducationalAttainmentDoctorateDegree"],
            "CosineScore": [0.7767]
        }],
        "AggCosineScore": 0.7267,
        "DelimBased": False
    }]
}


class TestDetectedVariables(unittest.TestCase):

  def test_main(self):
    self.assertEqual(
        _MULTI_SV,
        vars.multivar_candidates_to_dict(
            vars.dict_to_multivar_candidates(_MULTI_SV)))
