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

import unittest

import lib.nl.nl_utils as nl_utils


class TestNLUtils(unittest.TestCase):

  def test_add_to_set_from_list(self):
    list_with_words = ['more', 'words', 'including a sentence']
    expected = {'random', 'existing', 'more', 'including', 'a', 'sentence'}

    # Start with a few words.
    words_set = {'random', 'existing', 'words'}

    # Add some words
    nl_utils.add_to_set_from_list(words_set, list_with_words)
    self.assertCountEqual(words_set, {})
