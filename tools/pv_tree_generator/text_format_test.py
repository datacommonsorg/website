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
    ('ICD10','ICD10/A00-B99', '(A00-B99) Infectious, parasitic diseases'),
    ('NAICS','NAICS/10', 'All Industries'),
    ('DEA_DRUGS','drug/dea/1105B', 'Dl-Methamphetamine Racemic Base'),
    ('EQ_MAGNITUDES','M3Onwards', 'More than 3 Magnitude'),
    ('Years','Years18Onwards', 'More than 18 Years'),
    ('Crime','PropertyCrime', 'Property'),
    ('USC','USC_NonInstitutionalized', 'Non Institutionalized'),
    ('EnrolledInSchool','EnrolledInSchool', 'Enrolled In School'),
    ('Grade 8','EnrolledInGrade8', 'Grade 8')])
  def test_format_title(self, name, title, expected):
    self.assertEqual(text_format.format_title(title), expected)
    
  @parameterized.expand([
      ('year1', 'Years3To20', 'Years', '3 - 20 Years'),
      ('year2', 'YearsUpto5', 'Years', 'Less than 5 Years'),
      ('year3', 'Years75Onwards', 'Years', 'More than 75 Years'),
      ('year4', 'Year3', 'Year', '3 Years'),
      ('dollar1', 'USDollarUpto10000', 'USDollar', 'Less than 10,000 $'),
      ('dollar2', 'USDollar10000To14999', 'USDollar','10,000 - 14,999 $'),
      ('dollar6', 'USDollar2000000Onwards', 'USDollar','More than 2,000,000 $'),
      ('room1', 'Rooms1', 'Rooms','1 Rooms'),
      ('room2', 'Rooms2', 'Rooms','2 Rooms'),
      ('room3', 'Room3', 'Room', '3 Rooms')
  ])
  def test_format_range(self, name, range_enum, prefix, expected):
    self.assertEqual(text_format.format_range(range_enum, prefix), expected)
  
  @parameterized.expand([
      ('year1', {'enum': 'Years3To20'}, 3),
      ('year2', {'enum': 'YearsUpto5'}, 0),
      ('year3', {'enum': 'Years75Onwards'}, 75),
      ('dollar1', {'enum': 'USDollarUpto1000'}, 0),
      ('room1', {'enum': 'Rooms3'}, 3),
      ('room2', {'enum': 'Rooms'}, -1)])
  def test_rangeLow(self, name, enum_, expected):
    self.assertEqual(text_format.rangeLow(enum_), expected)
    
  #def test_filter_and_sort(self, name, prop, children, show_all, expected)
  #will be added later.
    
if __name__ == '__main__':
  unittest.main()
