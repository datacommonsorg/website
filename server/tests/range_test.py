# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import math
import unittest

import lib.range as lib_range


class TestConcatAggregate(unittest.TestCase):

    def test_us_age(self):
        input = [(0, 4), (5, 9), (10, 14), (15, 19),
                 (20, 24), (25, 29), (30, 34), (35, 39), (40, 44), (45, 49),
                 (50, 54), (55, 59), (60, 64), (65, 69), (70, 74), (75, 79),
                 (80, math.inf), (5, 17), (18, 24), (25, 34),
                 (35, 44), (45, 54), (55, 59), (60, 61), (62, 64), (65, 74),
                 (65, math.inf), (75, math.inf)]
        expected = [[(0, 4), (5, 9)], [(10, 14), (15, 19)], [(20, 24),
                                                             (25, 29)],
                    [(30, 34), (35, 39)], [(40, 44), (45, 49)],
                    [(50, 54), (55, 59)], [(60, 61), (62, 64), (65, 69)],
                    [(70, 74), (75, 79)], [(80, math.inf)]]
        assert lib_range.concat_aggregate_range(input) == expected

    def test_milpitas_age(self):
        input = [(5, 17), (18, 24), (25, 34), (35, 44), (45, 54), (55, 59),
                 (60, 61), (62, 64), (65, 74), (75, math.inf)]
        expected = [[(5, 17)], [(18, 24)], [(25, 34)], [(35, 44)], [(45, 54)],
                    [(55, 59), (60, 61), (62, 64)], [(65, 74)],
                    [(75, math.inf)]]
        assert lib_range.concat_aggregate_range(input) == expected


class TestBuildRangeGroup(unittest.TestCase):

    def test_milpitas_age(self):
        input = [
            'Count_Person_5To17Years', 'Count_Person_18To24Years',
            'Count_Person_25To34Years', 'Count_Person_35To44Years',
            'Count_Person_45To54Years', 'Count_Person_55To59Years',
            'Count_Person_60To61Years', 'Count_Person_62To64Years',
            'Count_Person_65To74Years', 'Count_Person_60To64Years',
            'Count_Person_75OrMoreYears'
        ]
        expected = {
            'Count_Person_5To17Years': 'Count_Person_5To17Years',
            'Count_Person_18To24Years': 'Count_Person_18To24Years',
            'Count_Person_25To34Years': 'Count_Person_25To34Years',
            'Count_Person_35To44Years': 'Count_Person_35To44Years',
            'Count_Person_45To54Years': 'Count_Person_45To54Years',
            'Count_Person_55To64Years': [
                'Count_Person_55To59Years', 'Count_Person_60To61Years',
                'Count_Person_62To64Years'
            ],
            'Count_Person_65To74Years': 'Count_Person_65To74Years',
            'Count_Person_75OrMoreYears': 'Count_Person_75OrMoreYears'
        }
        assert lib_range.build_stat_var_range_group(input, 'age') == expected