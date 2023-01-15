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
"""Tests for nl_utils functions."""

from parameterized import parameterized
import unittest

import lib.nl.nl_constants as nl_constants
import lib.nl.nl_utils as nl_utils


class TestNLUtilsAddToSet(unittest.TestCase):

  def test_add_to_set_from_list(self):
    list_with_words = ['more', 'words', 'including a sentence']

    # Start with a few words.
    words_set = {'random', 'existing', 'words'}
    expected = {
        'random', 'existing', 'words', 'more', 'including', 'a', 'sentence'
    }

    # Add some words
    nl_utils.add_to_set_from_list(words_set, list_with_words)
    self.assertCountEqual(words_set, expected)

  def test_combine_stop_words(self):
    # Tests that the call to combine_stop_words() is successful.
    try:
      got = nl_utils.combine_stop_words()
    except Exception as e:
      self.fail(
          f"Call to nl_utils.combine_stop_words() failed with Exception: {e}")

    # Check that all possible words constants are in the combined list.
    for word in nl_constants.STOP_WORDS:
      self.assertIn(word.lower(), got)

    for key in nl_constants.PLACE_TYPE_TO_PLURALS.keys():
      for word in key.split():
        self.assertIn(word.lower(), got)

    for val in nl_constants.PLACE_TYPE_TO_PLURALS.values():
      for word in val.split():
        self.assertIn(word.lower(), got)

    # This is the most complex because the values could we lists or
    # dictionary (of lists). The strings themselves are also sentences
    # which need to be split in to words.
    for d_vals in nl_constants.QUERY_CLASSIFICATION_HEURISTICS.values():
      vals_list = []
      if type(d_vals) == list:
        vals_list = [d_vals]
      elif type(d_vals) == dict:
        vals_list = d_vals.values()

      # At this point either vals_list is empty or a list of lists (of str).
      for words_list in vals_list:
        for words in words_list:
          for word in words.split():
            self.assertIn(word.lower(), got)


class TestNLUtilsRemoveStopWordsAndPunctuation(unittest.TestCase):

  @parameterized.expand([
      [
          "this is a random query",
          "random query",
      ],
      ["population of palo alto", "population palo alto"],
      ["tell me about life expectancy", "life expectancy"],
      ["what about Capitalization", "capitalization"],
      [
          "say something about crime in counties in California",
          "crime california"
      ],
      ["how are you", ""],
      [
          "interest rates among people who are living in poverty across US states",
          "interest rates people living poverty us"
      ],
  ])
  def test_query_remove_stop_words(self, query, expected):
    stop_words = nl_utils.combine_stop_words()
    self.assertEqual(nl_utils.remove_stop_words(query, stop_words), expected)

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
    self.assertEqual(nl_utils.remove_punctuations(query), expected)
