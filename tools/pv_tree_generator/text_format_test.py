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

from parameterized import parameterized
import unittest
import text_format


class TextFormatTest(unittest.TestCase):
    @parameterized.expand([
        ('ICD10', 'ICD10/A00-B99', '(A00-B99) Infectious, parasitic diseases'),
        ('NAICS', 'NAICS/10', 'All Industries'),
        ('DEA_DRUGS', 'drug/dea/1105B', 'Dl-Methamphetamine Racemic Base'),
        ('EQ_MAGNITUDES', 'M3Onwards', 'More than 3 Magnitude'),
        ('Years', 'Years18Onwards', 'More than 18 Years'),
        ('Crime', 'PropertyCrime', 'Property'),
        ('USC', 'USC_NonInstitutionalized', 'Non Institutionalized'),
        ('USC2', 'USC_HispanicOrLatinoRace', 'Hispanic Or Latino'),
        ('EnrolledInSchool', 'EnrolledInSchool', 'Enrolled In School'),
        ('Grade 8', 'EnrolledInGrade8', 'Grade 8')])
    def test_format_title(self, name, title, expected):
        self.assertEqual(text_format.format_title(title), expected)

    @parameterized.expand([
        ('year1', 'Years3To20', 'Years', '3 - 20 Years'),
        ('year2', 'YearsUpto5', 'Years', 'Less than 5 Years'),
        ('year3', 'Years75Onwards', 'Years', 'More than 75 Years'),
        ('year4', 'Year3', 'Year', '3 Years'),
        ('dollar1', 'USDollarUpto10000', 'USDollar', 'Less than 10,000 $'),
        ('dollar2', 'USDollar10000To14999', 'USDollar', '10,000 - 14,999 $'),
        ('dollar6', 'USDollar2000000Onwards', 'USDollar', 'More than 2,000,000 $'),
        ('room1', 'Rooms1', 'Rooms', '1 Rooms'),
        ('room2', 'Rooms2', 'Rooms', '2 Rooms'),
        ('room3', 'Room3', 'Room', '3 Rooms')
    ])
    def test_format_range(self, name, range_enum, prefix, expected):
        self.assertEqual(text_format.format_range(
            range_enum, prefix), expected)

    @parameterized.expand([
        ('year1', {'e': 'Years3To20'}, 3),
        ('year2', {'e': 'YearsUpto5'}, 0),
        ('year3', {'e': 'Years75Onwards'}, 75),
        ('dollar1', {'e': 'USDollarUpto1000'}, 0),
        ('room1', {'e': 'Rooms3'}, 3),
        ('room2', {'e': 'Rooms'}, -1)])
    def test_rangeLow(self, name, enum_, expected):
        self.assertEqual(text_format.rangeLow(enum_), expected)

    node1 = {"sv": "Count_Person_EnrolledInPrivateSchool",
              "l": "Private School"}
    node2 = {"sv":"Count_Person_3OrMoreYears_Female_EnrolledInPublicSchool",
              "l": "Public School"}
    sorted1 = [node1, node2]

    node3 = {"sv": "Count_Person_Upto5Years_Female_HispanicOrLatino",
              "l": "Hispanic Or Latino"}
    node4 = {"sv": "Count_Person_Upto5Years_Female_BlackOrAfricanAmericanAlone",
              "l": "Not in List"}
    
    node5 = {"sv": "dc/g8kg52zcxzw9f", "l": "Kindergarten"}
    node6 = {"sv": "dc/xj1ljvqpeqrq9", "l": "Grade 1 To Grade 4"}
    node7 = { "sv": "Count_Person_25OrMoreYears_EducationalAttainmentDoctorateDegree_Female",
          "l": "Doctorate Degree"}
    sorted2 = [node5, node7]

    @parameterized.expand([
        ("SchoolEnrollment1", "School Enrollment", [node1, node2], sorted1),
        ("SchoolEnrollment2", "School Enrollment", [node2, node1], sorted1),
        ("race1", "race", [node3, node4], [node3]),
        ("education", "educationalAttainment", [node6, node5, node7], sorted2)])
    def test_filter_and_sort(self, name, prop, children, expected):
        self.assertEqual(text_format.filter_and_sort(prop, children), expected)


if __name__ == '__main__':
    unittest.main()
