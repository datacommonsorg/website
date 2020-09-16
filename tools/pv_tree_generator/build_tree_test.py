# Copyright 2020 Google LLC
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
import json
from collections import defaultdict
import build_tree
import util


class BuildTreeTest(unittest.TestCase):
    """testing build_tree"""

    @staticmethod
    def get_sv():
        """ Mock with a subset real stats_var dcids
            The subset includes testing on the following aspects:
                - super enum e.g. Crime Type
                - specs with multiple obs_props defined in spec, e.g. GDP
                - top level reorganize, e.g. EarthquakeEvent_M3To4
                - sorting, e.g. educationalAttainment
                - specs with same cprop, different pop_type, 
                  e.g. "Count_Establishment_NAICSTotalAllIndustries",
                       "Count_Worker_NAICSTotalAllIndustries"
        """
        sv_dcid = [
            "Count_Person",
            "GrowthRate_Amount_EconomicActivity_GrossDomesticProduction",
            "Amount_EconomicActivity_GrossDomesticProduction_Nominal",
            "Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity",
            "Count_Person_Upto5Years",
            "Count_CriminalActivities_Arson",
            "Count_CriminalActivities_ViolentCrime",
            "Count_CriminalActivities_AggravatedAssault",
            "Count_CycloneEvent",
            "Count_EarthquakeEvent",
            "Count_FloodEvent",
            "Count_EarthquakeEvent_M3To4",
            "Count_CycloneEvent_ExtratropicalCyclone",
            "Count_Person_EnrolledInGrade1ToGrade4",
            "Count_Person_EnrolledInGrade5ToGrade8",
            "Count_Person_EducationalAttainmentNoSchoolingCompleted",
            "Count_Person_EducationalAttainmentKindergarten",
            "Count_Person_EducationalAttainmentNurserySchool",
            "Count_Establishment_NAICSTotalAllIndustries",
            "Count_Worker_NAICSTotalAllIndustries",
        ]
        return sv_dcid

    @staticmethod
    def get_triples_(dcids):
        """read the triples with predicates in the specified list"""
        triples = json.load(open("test_triples.json", "r"))
        return triples

    @patch('dc_request.get_triples')
    @patch('dc_request.get_sv_dcids')
    def test_build_tree(self, mock_get_sv, mock_get_triples):
        """build the tree with the mock functions, compare the result with
            hierarchy_test.json"""
        mock_get_sv.side_effect = self.get_sv
        mock_get_triples.side_effect = self.get_triples_
        data, _ = build_tree.build_tree(3)
        expected = json.load(open("./hierarchy_golden.json", "r"))
        self.assertEqual(data, expected)
        return


if __name__ == "__main__":
    unittest.main()
