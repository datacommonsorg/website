# Copyright 2024 Google LLC
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

import json
import unittest

from server.routes.explore import helpers
from web_app import app


class TestPostBodyCacheKey(unittest.TestCase):

  def test_request_with_no_context_history_does_cache(self):
    test_data = {'key1': 'value1'}

    with app.test_request_context('/test?a=b', method='POST', json=test_data):
      # Expected cache key is the URL + post body
      expected_cache_key = f"/test?a=b," + json.dumps(test_data, sort_keys=True)

      # Ensure calculated cache value matches
      cache_key = helpers.explore_post_body_cache_key()
      self.assertEqual(cache_key, expected_cache_key)

  def test_request_with_empty_context_history_does_cache(self):
    test_data = {'key1': 'value1', 'contextHistory': []}

    with app.test_request_context('/test?a=b', method='POST', json=test_data):
      # Expected cache key is the URL + post body
      expected_cache_key = f"/test?a=b," + json.dumps(test_data, sort_keys=True)

      # Ensure calculated cache value matches
      cache_key = helpers.explore_post_body_cache_key()
      self.assertEqual(cache_key, expected_cache_key)

  def test_request_with_non_empty_context_history_does_not_cache(self):
    test_data = {'key1': 'value1', 'contextHistory': [{'context': 'value'}]}

    with app.test_request_context('/test', method='POST', json=test_data):
      # Expected cache key is none since there is a non-empty contextHistory
      expected_cache_key = None

      # Ensure calculated cache value matches
      cache_key = helpers.explore_post_body_cache_key()
      self.assertEqual(cache_key, expected_cache_key)
