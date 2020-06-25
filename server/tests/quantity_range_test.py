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

from lib import quantity_range as qr


class QuantityRangeTest(unittest.TestCase):

  @parameterized.expand([
      ('year1', 'Year3To20',
       qr.QuantityRange(3, 20, qr.QuantityType.YEAR, 'Years')),
      ('year2', 'YearsUpto5',
       qr.QuantityRange(None, 5, qr.QuantityType.YEAR, 'Years')),
      ('year3', 'Year75Onwards',
       qr.QuantityRange(75, None, qr.QuantityType.YEAR, 'Years')),
      ('dollar1', 'USDollarUpto10000',
       qr.QuantityRange(None, 10000, qr.QuantityType.USDOLLAR, '$')),
      ('dollar2', 'USDollar10000To14999',
       qr.QuantityRange(10000, 14999, qr.QuantityType.USDOLLAR, '$')),
      ('room1', 'Room1', qr.QuantityRange(1, 1, qr.QuantityType.ROOM, 'Rooms')),
  ])
  def test_parse_quantity_range(self, name, qr_str, expected_range):
    self.assertEqual(qr.parse(qr_str), expected_range)

  @parameterized.expand([
      ('year1', 'Years3To20', '3 - 20 Years'),
      ('year2', 'YearsUpto5', 'Less than 5 Years'),
      ('year3', 'Years75Onwards', 'More than 75 Years'),
      ('dollar1', 'USDollarUpto10000', 'Less than $10K'),
      ('dollar2', 'USDollar10000To14999', '$10K - $15K'),
      ('dollar3', 'USDollar15000To19999', '$15K - $20K'),
      ('dollar4', 'USDollar400000To499999', '$400K - $500K'),
      ('dollar5', 'USDollar1000000To1499999', '$1M - $1.5M'),
      ('dollar6', 'USDollar2000000Onwards', 'More than $2M'),
      ('room1', 'Rooms1', '1 Rooms'),
      ('room2', 'Rooms2', '2 Rooms'),
  ])
  def test_display_text(self, name, qr_str, expected_text):
    quantity_range = qr.parse(qr_str)
    self.assertEqual(quantity_range.display_text(), expected_text)

  @parameterized.expand([
      ('t1', 'Years3To20', 'Years5To40', False),
      ('t2', 'Years3To20', 'Years1To15', False),
      ('t3', 'Years3To20', 'Years1To2', False),
      ('t4', 'Years3To20', 'Years30To40', False),
      ('t5', 'Years3To20', 'Years3To40', True),
      ('t6', 'YearsUpto5', 'YearsUpto10', True),
      ('t7', 'YearsUpto5', 'YearsUpto3', False),
      ('t8', 'YearsUpto5', 'Years3To8', False),
      ('t9', 'YearsUpto5', 'Years10To50', False),
      ('t10', 'YearsUpto5', 'Years75Onwards', False),
      ('t11', 'Years75Onwards', 'YearsUpto10', False),
      ('t12', 'Years75Onwards', 'YearsUpto80', False),
      ('t13', 'Years75Onwards', 'Years3To85', False),
      ('t14', 'Years75Onwards', 'Years10To50', False),
      ('t15', 'Years75Onwards', 'Years65Onwards', True),
  ])
  def test_in_range(self, name, qr_str1, qr_str2, expect_result):
    qr1 = qr.parse(qr_str1)
    qr2 = qr.parse(qr_str2)
    self.assertEqual(qr1.in_range(qr2), expect_result)


if __name__ == '__main__':
  unittest.main()