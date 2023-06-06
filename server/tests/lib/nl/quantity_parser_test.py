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
"""Tests for quantity_parser."""

import logging
import unittest

from parameterized import parameterized

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection import quantity


class TestQuantityParser(unittest.TestCase):

  # Simple
  # factors
  # decimals
  @parameterized.expand([
      ('cities where the median age is 50', '((EQ 50.0) idx:27)'),
      ('cities where the median age is equal to 50', '((EQ 50.0) idx:30)'),
      ('cities where the median age equals 50', '((EQ 50.0) idx:27)'),
      ('cities which have 1M people', '((EQ 1000000) idx:12)'),
      ('cities with as much as 1M people', '((EQ 1000000) idx:11)'),
      ('cities where the median age is somewhere near 50', None),
      ('cities where population is over 1M', '((GT 1000000) idx:26)'),
      ('cities where population is above 1M', '((GT 1000000) idx:26)'),
      ('cities where population exceeds 1M', '((GT 1000000) idx:23)'),
      ('cities with population more than 1M', '((GT 1000000) idx:22)'),
      ('cities with population greater than 1M', '((GT 1000000) idx:22)'),
      ('cities with population higher than 1M', '((GT 1000000) idx:22)'),
      ('cities with population upwards of 1M', '((GT 1000000) idx:22)'),
      ('cities where population is under 100K', '((LT 100000) idx:26)'),
      ('cities where population is below 100K', '((LT 100000) idx:26)'),
      ('cities with population less than 100K', '((LT 100000) idx:22)'),
      ('cities with population lesser than 100K', '((LT 100000) idx:22)'),
      ('cities with population lower than 100K', '((LT 100000) idx:22)'),
      ('cities with population greater than or equal to 1B',
       '((GE 1000000000) idx:22)'),
      ('cities with population greater than or equals 1   B',
       '((GE 1000000000) idx:22)'),
      ('population from 1B people', '((GE 1000000000) idx:10)'),
      ('cities with population less than or equal to 1000',
       '((LE 1000.0) idx:22)'),
      ('cities with population less than or equals 1000',
       '((LE 1000.0) idx:22)'),
      ('cities with population upto 1000', '((LE 1000.0) idx:22)'),
      ('cities with population up to 1000', '((LE 1000.0) idx:22)'),
      ('counties with median age between 10 and 30',
       '((GE 10.0) (LE 30.0) idx:24)'),
      ('counties where median age ranges from 10 to 30',
       '((GE 10.0) (LE 30.0) idx:32)'),
      ('cities with median age >10 <=20', '((GT 10.0) (LE 20.0) idx:22)'),
      ('cities with median age >=10 <20', '((GE 10.0) (LT 20.0) idx:22)'),
      ('cities with median age >=10 <=20', '((GE 10.0) (LE 20.0) idx:22)'),
      # Because we don't mix equality with inequality.
      ('cities with median age ==10 <=20', None),
      # Because this is not a valid range.
      ('cities with median age <=10 >=20', None),
      ('cities with median age <=30 >=20', '((GE 20.0) (LE 30.0) idx:22)'),
      ('in cities with poverty rate under 10% \show me asthma prevalence',
       '((LT 10.0) idx:27)'),
      ('countries where gdp growth rate was greater than 2.5%',
       '((GT 2.5) idx:35)'),
      ('counties with 10 million dollar homes', None),
      ('counties where home prices exceed 10    million dollars',
       '((GT 10000000) idx:26)'),
      ('how many people with Age Greater Than 20 And Lesser Than Or Equals 49',
       '((GT 20.0) (LE 49.0) idx:24)'),
      ('countries with over 1 Trillion dollars GDP',
       '((GT 1000000000000) idx:14)'),
      ('countries with under 1 billion euro GDP', '((LT 1000000000) idx:14)'),
      ('countries with over 10B people', '((GT 10000000000) idx:14)'),
      ('counties with employees earning over 10 thousand usd on average',
       '((GT 10000) idx:31)'),
  ])
  def test_main(self, query, expected):
    ctr = Counters()
    attr = quantity.parse_quantity(query, ctr)
    logging.info(attr)
    if attr:
      actual = str(attr)
      self.assertEqual(actual, expected)
    else:
      self.assertTrue(not expected)
