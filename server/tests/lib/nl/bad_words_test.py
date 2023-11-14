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
    # Phrase: "very good sentence"
    self.assertFalse(
        bad_words.is_safe('is that a very good sentence really', bw))
    # Another ordering of the words is fine.
    self.assertTrue(bad_words.is_safe('bad word very', bw))
    self.assertTrue(bad_words.is_safe('word bad very', bw))
    self.assertTrue(bad_words.is_safe('very word bad', bw))
    # Subset of phrases should be fine
    self.assertTrue(bad_words.is_safe('that very bad story', bw))
    self.assertTrue(bad_words.is_safe('that bad word was epic', bw))
    self.assertTrue(bad_words.is_safe('that bad sentence was legendary', bw))

    # Multi words: cat and holy
    self.assertFalse(bad_words.is_safe('oh that cat is real holy', bw))
    # Multi words: cat, moly and doly
    self.assertFalse(bad_words.is_safe('doly is cat that has moly', bw))
    # Any single word is fine.
    self.assertTrue(bad_words.is_safe('is that cow holy too', bw))
    self.assertTrue(bad_words.is_safe('is doly having moly holy', bw))
    self.assertTrue(bad_words.is_safe('my cat is named doly', bw))
    self.assertTrue(bad_words.is_safe('cat on the wall', bw))

    # Multi words: Cross
    # white and board are in the two cross sets.
    self.assertFalse(bad_words.is_safe('white board is a nice tool', bw))
    # black and chalk are in the two cross sets.
    self.assertFalse(bad_words.is_safe('chalk is black it is not ok', bw))
    # man and use are in the two cross sets.
    self.assertFalse(bad_words.is_safe('man can use some help', bw))
    # woman and abuse are in the two cross sets.
    self.assertFalse(bad_words.is_safe('abuse of a woman is not ok', bw))
    # child and abuse are in the two cross sets.
    self.assertFalse(bad_words.is_safe('child abuse is terrible', bw))

    # white and black are in the same cross set so should not trigger.
    self.assertTrue(bad_words.is_safe('white black is a good tool', bw))
    # chalk and board are in the same cross set so should not trigger.
    self.assertTrue(bad_words.is_safe('i write on a chalk board', bw))
    # man, woman and child are in the same cross set so should not trigger.
    self.assertTrue(bad_words.is_safe('happy people: woman child man', bw))
    # abuse and use are in the same cross set so should not trigger.
    self.assertTrue(bad_words.is_safe('what use is abuse?', bw))

    # three sets.
    # rule: wording,word:two,second:three,third
    self.assertFalse(bad_words.is_safe('first second and third wording', bw))
    self.assertFalse(bad_words.is_safe('word which means two but three', bw))

    # only hitting two of the three sets above.
    self.assertTrue(bad_words.is_safe('first second and wording', bw))
    self.assertTrue(bad_words.is_safe('word which means two but is one', bw))

  def test_validate_prod(self):
    bad_words.validate_bad_words()
