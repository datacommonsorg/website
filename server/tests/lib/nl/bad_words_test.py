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
"""Tests for bad_words functions."""

import unittest

import server.lib.nl.common.bad_words as bad_words


class TestBadWords(unittest.TestCase):

  def test_sample(self):
    bw = bad_words.load_bad_words_file('server/tests/test_data/bad_words.txt')

    # Non-existent words
    self.assertTrue(bad_words.is_safe('number of people', bw))

    # Single-word: "stupid"
    self.assertFalse(bad_words.is_safe('is it that stupid', bw))
    self.assertFalse(bad_words.is_safe('who said stupid is as stupid does', bw))

    # Phrase: "very bad word"
    self.assertFalse(bad_words.is_safe('is that a very bad word really', bw))
    self.assertFalse(
        bad_words.is_safe('is that a very good sentence really', bw))
    # Subset of phrases should be fine
    self.assertTrue(bad_words.is_safe('that very bad story', bw))
    self.assertTrue(bad_words.is_safe('that bad word was epic', bw))
    self.assertTrue(bad_words.is_safe('that bad sentence was legendary', bw))

    # Multi words: cat and holy
    self.assertFalse(bad_words.is_safe('oh that cat is real holy', bw))
    # Any single word is fine.
    self.assertTrue(bad_words.is_safe('is that cow holy too', bw))
    self.assertTrue(bad_words.is_safe('cat on the wall', bw))

  def test_validate_prod(self):
    bad_words.validate_bad_words()
