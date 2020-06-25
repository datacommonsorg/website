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

from lib import coordinate_calculator as cc

class TransformTest(unittest.TestCase):

  def test_transform(self):
    origin_val = (1999, 30)
    origin_pos = (40, 200)
    scale = (10, 3)
    data_list = [(1999.1, 33), (2000.4, 44), (2001.8, 56), (2002.8, 79),
                 (2003.9, 100.2), (2005.2, 82.1)]
    expected_transformed_list = []
    for data, expected in zip(data_list, expected_transformed_list):
      self.assertEqual(
          cc.transform(data, origin_val, origin_pos, scale), expected)


class ComputeTest(unittest.TestCase):

  def test_calculate_coordinate_one_line(self):
    input_data = [[('1999', 21), ('2000', 31), ('2001', 45), ('2002', 11),
                   ('2003', 52), ('2004', 78), ('2005', 132), ('2006', 69),
                   ('2007', 89), ('2008', 98), ('2009', 100), ('2010', 121)]]
    expected_output_data = [[(125.0, 176.2), (145.0, 164.9), (165.0, 149.0),
                             (185.0, 187.5), (205.0, 141.1), (225.0, 111.6),
                             (245.0, 50.4), (265.0, 121.8), (285.0, 99.13),
                             (305.0, 88.93), (325.0, 86.67), (345.0, 62.87)]]
    expected_x_ticks = [(45.0, 200.0, '1995'), (145.0, 200.0, '2000'),
                        (245.0, 200.0, '2005'), (345.0, 200.0, '2010')]
    expected_y_ticks = [(30.0, 200.0, '0'), (30.0, 143.3, '50'),
                        (30.0, 86.67, '100'), (30.0, 30.0, '150')]
    data, xticks, yticks = cc.compute(input_data, (30, 360), (30, 200))

    self.assertEqual(data, expected_output_data)
    self.assertEqual(xticks, expected_x_ticks)
    self.assertEqual(yticks, expected_y_ticks)

  def test_calculate_coordinate_two_lines(self):
    input_data = [[('1999', 21), ('2000', 31), ('2001', 45), ('2002', 11),
                   ('2003', 52)],
                  [('2002', 31), ('2003', 98), ('2004', 78), ('2009', 100),
                   ('2010', 121)]]
    expected_output_data = [[(125.0, 176.2), (145.0, 164.9), (165.0, 149.0),
                             (185.0, 187.5), (205.0, 141.1)],
                            [(185.0, 164.9), (205.0, 88.93), (225.0, 111.6),
                             (325.0, 86.67), (345.0, 62.87)]]
    expected_x_ticks = [(45.0, 200.0, '1995'), (145.0, 200.0, '2000'),
                        (245.0, 200.0, '2005'), (345.0, 200.0, '2010')]
    expected_y_ticks = [(30.0, 200.0, '0'), (30.0, 143.3, '50'),
                        (30.0, 86.67, '100'), (30.0, 30.0, '150')]
    data, xticks, yticks = cc.compute(input_data, (30, 360), (30, 200))

    self.assertEqual(data, expected_output_data)
    self.assertEqual(xticks, expected_x_ticks)
    self.assertEqual(yticks, expected_y_ticks)


class ComputeYTickTest(unittest.TestCase):

  @parameterized.expand([
      ('1e-4', 0.0004, [0, 1e-4, 2e-4, 3e-4, 4e-4, 5e-4],
       ['0', '100e-6', '200e-6', '300e-6', '400e-6', '500e-6']),
      ('1e-3', 0.004, [0, 1e-3, 2e-3, 3e-3, 4e-3, 5e-3
                      ], ['0', '0.001', '0.002', '0.003', '0.004', '0.005']),
      ('1e-2', 0.04, [0, 0.01, 0.02, 0.03, 0.04, 0.05
                     ], ['0', '0.01', '0.02', '0.03', '0.04', '0.05']),
      ('1e-1', 0.4, [0, 0.1, 0.2, 0.3, 0.4, 0.5
                    ], ['0', '0.1', '0.2', '0.3', '0.4', '0.5']),
      ('single', 4, [0, 1, 2, 3, 4, 5], ['0', '1', '2', '3', '4', '5']),
      ('thousand_1', 2010, [0, 500, 1000, 1500, 2000, 2500
                           ], ['0', '0.5K', '1.0K', '1.5K', '2.0K', '2.5K']),
      ('thousand_2', 3203, [0, 1000, 2000, 3000, 4000
                           ], ['0', '1K', '2K', '3K', '4K']),
      ('thousand_3', 5203, [0, 2000, 4000, 6000], ['0', '2K', '4K', '6K']),
      ('thousand_4', 15001, [0, 5000, 10000, 15000, 20000
                            ], ['0', '5K', '10K', '15K', '20K']),
      ('thousand_5', 62032, [0, 20000, 40000, 60000, 80000
                            ], ['0', '20K', '40K', '60K', '80K']),
      ('million_1', 1.8e6, [0, 0.5e6, 1e6, 1.5e6, 2e6
                           ], ['0', '0.5M', '1.0M', '1.5M', '2.0M']),
      ('billion_1', 1.8e9, [0, 0.5e9, 1e9, 1.5e9, 2e9
                           ], ['0', '0.5B', '1.0B', '1.5B', '2.0B']),
      ('trillion_1', 1.8e12, [0, 0.5e12, 1e12, 1.5e12, 2e12
                             ], ['0', '0.5T', '1.0T', '1.5T', '2.0T']),
      ('quadrillion_1', 1.8e15, [0, 0.5e15, 1e15, 1.5e15, 2e15
                                ], ['0', '0.5Q', '1.0Q', '1.5Q', '2.0Q'])
  ])
  def test_positive_y_tick(self, name, y, expected_value, expected_text):
    res = cc._compute_y_ticks(y / 2.0, y)
    res_val = [x[0] for x in res]
    res_text = [x[1] for x in res]
    for a, b in zip(res_val, expected_value):
      self.assertAlmostEqual(a, b)
    self.assertEqual(res_text, expected_text)

  @parameterized.expand([
      ('cross', -4, 3, [-4, -2, 0, 2, 4], ['-4', '-2', '0', '2', '4']),
      ('single', -4, -2, [-4, -3, -2, -1, 0], ['-4', '-3', '-2', '-1', '0']),
      ('1e-1', -0.39, -0.02, [-0.4, -0.3, -0.2, -0.1, 0
                             ], ['-0.4', '-0.3', '-0.2', '-0.1', '0'])
  ])
  def test_negative_y_tick(self, name, y_min, y_max, expected_value, expected_text):
    res = cc._compute_y_ticks(y_min, y_max)
    res_val = [x[0] for x in res]
    res_text = [x[1] for x in res]
    for a, b in zip(res_val, expected_value):
      self.assertAlmostEqual(a, b)
    self.assertEqual(res_text, expected_text)

  def test_invalid_y(self):
    with self.assertRaises(ValueError):
      cc._compute_y_ticks(0, 1e20)


class ComputeXTickTest(unittest.TestCase):

  @parameterized.expand([
      ('fraction', (2013.1, 2015.1, 2017.7), [(2013, '2013'), (2015, '2015'),
                                              (2017, '2017'), (2018, '2018')]),
      ('test1', range(2011, 2017), [(2011, '2011'), (2013, '2013'),
                                    (2015, '2015'), (2016, '2016')]),
      ('test2', range(1998, 2015), [(1995, '1995'), (2000, '2000'),
                                    (2005, '2005'), (2010, '2010'),
                                    (2014, '2014')]),
      ('test3', range(1998, 2017), [(1995, '1995'), (2000, '2000'),
                                    (2005, '2005'), (2010, '2010'),
                                    (2015, '2015'), (2016, '2016')]),
      ('test3_day', [1997.313, 2016], [(1995, '1995'), (2000, '2000'),
                                       (2005, '2005'), (2010, '2010'),
                                       (2015, '2015'), (2016, '2016')]),
      # Very much under 5/12 threshold
      ('test_m1', [2002.1, 2002.12, 2002.13], [(2002.0876712328768, 'Feb 2002'),
                                               (2002.164383561644, 'Mar 2002')]
      ),
      # Just under 5/12 threshold
      ('test_m2', [2002.1, 2002.12, 2002.5], [(2002.0876712328768, 'Feb 2002'),
                                              (2002.164383561644, 'Mar 2002'),
                                              (2002.2493150684932, 'Apr 2002'),
                                              (2002.331506849315, 'May 2002'),
                                              (2002.4164383561645, 'Jun 2002'),
                                              (2002.4986301369863, 'Jul 2002'),
                                              (2002.5835616438355, 'Aug 2002')]
      ),
      # Just over 5/12 threshold
      ('test_b1', [2000.01, 2000.4, 2000.45], [(2000.0027322404371, 'Jan 2000'),
                                               (2000.1666666666667, 'Mar 2000'),
                                               (2000.3333333333333, 'May 2000'),
                                               (2000.5, 'Jul 2000')]),
      # Just under 11/12 threshold
      ('test_b2', [2000.01, 2000.4, 2000.9], [(2000.0027322404371, 'Jan 2000'),
                                              (2000.1666666666667, 'Mar 2000'),
                                              (2000.3333333333333, 'May 2000'),
                                              (2000.5, 'Jul 2000'),
                                              (2000.6693989071039, 'Sep 2000'),
                                              (2000.8360655737704, 'Nov 2000'),
                                              (2001.0027397260274, 'Jan 2001')]
      ),
      # Just over 11/12 threshold
      ('test_q1', [2000.1, 2001.02], [(2000.0874316939892, 'Feb 2000'),
                                      (2000.3333333333333, 'May 2000'),
                                      (2000.5846994535518, 'Aug 2000'),
                                      (2000.8360655737704, 'Nov 2000'),
                                      (2001.0876712328768, 'Feb 2001')]),
      # Just under 17/12 threshold
      ('test_q2', [2000.1, 2000.7, 2001.5], [(2000.0874316939892, 'Feb 2000'),
                                             (2000.3333333333333, 'May 2000'),
                                             (2000.5846994535518, 'Aug 2000'),
                                             (2000.8360655737704, 'Nov 2000'),
                                             (2001.0876712328768, 'Feb 2001'),
                                             (2001.331506849315, 'May 2001'),
                                             (2001.5835616438355, 'Aug 2001')]),
      # Just over 17/12 threshold
      ('test_day_large', [2000.1, 2000.7, 2001.6], [(2000, '2000'),
                                                    (2002, '2002')])
  ])
  def test_x_tick(self, name, x, expected):
    res = cc._compute_x_ticks(x)
    self.assertEqual(res, expected)


if __name__ == '__main__':
  unittest.main()
