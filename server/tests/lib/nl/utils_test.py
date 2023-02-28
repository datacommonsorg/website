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

from parameterized import parameterized

import server.lib.nl.constants as constants
import server.lib.nl.utils as utils


class TestNLUtilsAddToSet(unittest.TestCase):

  def test_add_to_set_from_list(self):
    list_with_words = ['more', 'words', 'including a sentence']

    # Start with a few words.
    words_set = {'random', 'existing', 'words'}
    expected = {'random', 'existing', 'words', 'more', 'including a sentence'}

    # Add some words
    utils.add_to_set_from_list(words_set, list_with_words)
    self.assertCountEqual(words_set, expected)

  def test_combine_stop_words(self):
    # Tests that the call to combine_stop_words() is successful.
    try:
      got = utils.combine_stop_words()
    except Exception as e:
      self.fail(
          f"Call to utils.combine_stop_words() failed with Exception: {e}")

    # Check that all possible words constants are in the combined list.
    for word in constants.STOP_WORDS:
      self.assertIn(word.lower(), got)

    for key in constants.PLACE_TYPE_TO_PLURALS.keys():
      self.assertIn(key.lower(), got)

    for val in constants.PLACE_TYPE_TO_PLURALS.values():
      self.assertIn(val.lower(), got)

    # This is the most complex because the values could we lists or
    # dictionary (of lists). The strings themselves are also sentences
    # which need to be split in to words.
    for d_vals in constants.QUERY_CLASSIFICATION_HEURISTICS.values():
      vals_list = []
      if type(d_vals) == list:
        vals_list = [d_vals]
      elif type(d_vals) == dict:
        vals_list = d_vals.values()

      # At this point either vals_list is empty or a list of lists (of str).
      for words_list in vals_list:
        for words in words_list:
          self.assertIn(words.lower(), got)


class TestNLUtilsRemoveStopWordsAndPunctuation(unittest.TestCase):

  @parameterized.expand([
      [
          "this is a random query",
          "random query",
      ],
      ["population of palo alto", "population palo alto"],
      ["tell me about life expectancy", "life expectancy"],
      ["what about Capitalization", "capitalization"],
      ["say something about crime in California counties", "crime california"],
      ["how are you", ""],
      ["tell me about the climate extremes in palo alto", "climate palo alto"],
      [
          "How big are the public elementary schools in Sunnyvale",
          "big public sunnyvale"
      ],
      [
          "what is relationship between the sickest and healthiest people in the world",
          "people world"
      ],
      ["how does it correlate with heart disease", "heart disease"],
      ["best high schools in Florida counties", "florida"],
      [
          "interest rates among people who are living in poverty across US states",
          "interest rates people living poverty us"
      ],
  ])
  def test_query_remove_stop_words(self, query, expected):
    stop_words = utils.combine_stop_words()
    self.assertEqual(utils.remove_stop_words(query, stop_words), expected)

  @parameterized.expand([
      [
          "this is a random query with no punctuation",
          "this is a random query with no punctuation",
      ],
      [
          "people of palo alto, mountain view and California!",
          "people of palo alto mountain view and California"
      ],
      ["America's population.growth", "America population growth"],
      ["Is this a question?", "Is this a question"],
      ["what about Santa@Clara*&^%", "what about Santa Clara"],
      ["'===()@#$%^&---`~:|][{}/?><,.,\"", ""],
  ])
  def test_query_remove_punctuation(self, query, expected):
    self.assertEqual(utils.remove_punctuations(query), expected)


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
    gr = utils.compute_series_growth(s, 100.0)
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
    gr = utils.compute_series_growth(s, 100.0)
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
    gr = utils.compute_series_growth(s, 100.0)
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
    gr = utils.compute_series_growth(s, 100.0)
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
      utils.compute_series_growth(s, 100.0)
    self.assertTrue(
        'Dates have different granularity' in str(context.exception))
