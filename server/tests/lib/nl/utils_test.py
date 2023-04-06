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
"""Tests for utils functions."""

import unittest

import server.lib.nl.utils as utils


class TestComputeGrowthRate(unittest.TestCase):

  def test_year(self):
    s = [
        {
            'date': '2019',
            'value': 20
        },
        {
            'date': '2018',
            'value': 10
        },
        {
            'date': '2017',
            'value': 10
        },
    ]
    # (20 - 10) / (2 years * 10)
    gr = utils._compute_series_growth(s, 100.0)
    self.assertEqual(0.0013698630136986301, gr.pct)
    self.assertEqual(0.0136986301369863, gr.abs)
    self.assertEqual(0.00013698630136986303, gr.pc)

  def test_month_unadjusted(self):
    s = [
        {
            'date': '2019-06',
            'value': 10
        },
        {
            'date': '2018-06',
            'value': 10
        },
        {
            'date': '2017-06',
            'value': 20
        },
    ]
    # (10 - 20) / (24 months * 20)
    gr = utils._compute_series_growth(s, 100.0)
    self.assertEqual(-0.0006849315068493151, gr.pct)
    self.assertEqual(-0.0136986301369863, gr.abs)
    self.assertEqual(-0.00013698630136986303, gr.pc)

  # Here we will pick 2017-06 instead of 2017-01 to match the latest month (2017-06),
  # and thus same result as before.
  def test_month_adjusted(self):
    s = [
        {
            'date': '2019-06',
            'value': 10
        },
        {
            'date': '2019-01',
            'value': 100
        },
        {
            'date': '2018-06',
            'value': 10
        },
        {
            'date': '2018-06',
            'value': 100
        },
        {
            'date': '2017-06',
            'value': 20
        },
        {
            'date': '2017-01',
            'value': 200
        },
    ]
    # (10 - 20) / (24 months * 20)
    gr = utils._compute_series_growth(s, 100.0)
    self.assertEqual(-0.0006849315068493151, gr.pct)
    self.assertEqual(-0.0136986301369863, gr.abs)
    self.assertEqual(-0.00013698630136986303, gr.pc)

  def test_day(self):
    s = [
        {
            'date': '2019-12-01',
            'value': 20
        },
        {
            'date': '2018-12-01',
            'value': 10
        },
        {
            'date': '2017-12-01',
            'value': 10
        },
    ]
    # (20 - 10) / (2 years * 10)
    gr = utils._compute_series_growth(s, 100.0)
    self.assertEqual(0.0013698630136986301, gr.pct)
    self.assertEqual(0.0136986301369863, gr.abs)
    self.assertEqual(0.00013698630136986303, gr.pc)

  def test_error(self):
    s = [
        {
            'date': '2019-12-01',
            'value': 20
        },
        {
            'date': '2018-11',
            'value': 10
        },
        {
            'date': '2017',
            'value': 10
        },
    ]
    with self.assertRaises(ValueError) as context:
      utils._compute_series_growth(s, 100.0)
    self.assertTrue(
        'Dates have different granularity' in str(context.exception))
