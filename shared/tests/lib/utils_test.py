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

import shared.lib.constants as constants
import shared.lib.utils as utils


class TestUtilsAddToSet(unittest.TestCase):

  def test_add_to_set_from_list(self):
    list_with_words = ['more', 'words', 'including a sentence']

    # Start with a few words.
    words_set = {'random', 'existing', 'words'}
    expected = {'random', 'existing', 'words', 'more', 'including a sentence'}

    # Add some words
    utils._add_to_set_from_list(words_set, list_with_words)
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
      if key in constants.NON_GEO_PLACE_TYPES:
        continue
      self.assertIn(key.lower(), got)
      self.assertIn(constants.PLACE_TYPE_TO_PLURALS[key].lower(), got)

    # This is the most complex because the values could we lists or
    # dictionary (of lists). The strings themselves are also sentences
    # which need to be split in to words.
    for ctype, d_vals in constants.QUERY_CLASSIFICATION_HEURISTICS.items():
      if ctype in constants.HEURISTIC_TYPES_IN_VARIABLES:
        continue
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
          "big public elementary schools sunnyvale"
      ],
      [
          "what is relationship between the sickest and healthiest people in the world",
          "people world"
      ],
      ["how does it correlate with heart disease", "heart disease"],
      ["best high schools in Florida counties", "schools florida"],
      [
          "interest rates among people who are living in poverty across US states",
          "interest people living poverty us"
      ],
      [
          "how many hispanics people in california",
          "how many hispanics people california"
      ],
      [
          "what is the number of students in new york",
          "number of students new york"
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


class TestUtilsEscapeStrings(unittest.TestCase):

  @parameterized.expand([
      [
          '<test string>',
          '&lt;test string&gt;',
      ],
      [
          ['<test string 1>', '<test string 2>', '<test string 3>'],
          [
              '&lt;test string 1&gt;', '&lt;test string 2&gt;',
              '&lt;test string 3&gt;'
          ],
      ],
      [{
          'key1': [{
              'key2': '<test string 2>'
          }],
          'key3>': '<test string 3>',
          'key4': {
              'key4': '<test string 4>'
          }
      }, {
          'key1': [{
              'key2': '&lt;test string 2&gt;'
          }],
          'key3&gt;': '&lt;test string 3&gt;',
          'key4': {
              'key4': '&lt;test string 4&gt;'
          }
      }],
  ])
  def test_escape_strings(self, test_object, expected):
    escaped_object = utils.escape_strings(test_object)
    self.assertEqual(escaped_object, expected)
