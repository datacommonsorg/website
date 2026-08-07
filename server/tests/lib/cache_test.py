# Copyright 2026 Google LLC
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

import unittest

from flask import g
from flask_caching import Cache

from server.__init__ import create_app


class TestCohortAwareCache(unittest.TestCase):
  """Test suite for CohortAwareCache subclassing and key partitioning/invalidation."""

  @classmethod
  def setUpClass(cls):
    cls.app = create_app()
    cls.client = cls.app.test_client()

  @classmethod
  def tearDownClass(cls):
    cls.app = None
    cls.client = None

  def test_memoize_cache_partition_and_invalidation(self):
    local_cache = Cache(
        self.app,
        config={
            'CACHE_TYPE': 'server.lib.cache.cohort_aware_simple_cache_factory'
        })
    call_count = 0

    @local_cache.memoize(timeout=300)
    def my_memoized_fn(val):
      nonlocal call_count
      call_count += 1
      return f"result: {val}"

    # Verify that caching works normally
    # Context 1: Spanner cohort
    with self.app.test_request_context():
      g.use_spanner = True
      res1 = my_memoized_fn("foo")
      res2 = my_memoized_fn("foo")
      # Cache hit, call_count should be 1
      self.assertEqual(call_count, 1)
      self.assertEqual(res1, "result: foo")
      self.assertEqual(res2, "result: foo")

    # Context 2: BT cohort
    with self.app.test_request_context():
      g.use_spanner = False
      res3 = my_memoized_fn("foo")
      # Cache miss (different cohort), call_count should be 2
      self.assertEqual(call_count, 2)
      self.assertEqual(res3, "result: foo")

    # Now verify delete_memoized invalidates both cohorts
    with self.app.test_request_context():
      # Delete key for arg "foo"
      local_cache.delete_memoized(my_memoized_fn, "foo")

    # Context 1 should miss now
    with self.app.test_request_context():
      g.use_spanner = True
      my_memoized_fn("foo")
      self.assertEqual(call_count, 3)

    # Context 2 should also miss now
    with self.app.test_request_context():
      g.use_spanner = False
      my_memoized_fn("foo")
      self.assertEqual(call_count, 4)

  def test_cached_route_partitioning(self):
    local_cache = Cache(
        self.app,
        config={
            'CACHE_TYPE': 'server.lib.cache.cohort_aware_simple_cache_factory'
        })
    call_count = 0

    @local_cache.cached(timeout=300)
    def my_cached_fn():
      nonlocal call_count
      call_count += 1
      return f"count: {call_count}"

    # Verify that caching works and partitions by cohort
    # Context 1: Spanner cohort
    with self.app.test_request_context('/my-test-path'):
      g.use_spanner = True
      res1 = my_cached_fn()
      res2 = my_cached_fn()
      self.assertEqual(call_count, 1)
      self.assertEqual(res1, "count: 1")
      self.assertEqual(res2, "count: 1")

    # Context 2: BT cohort
    with self.app.test_request_context('/my-test-path'):
      g.use_spanner = False
      res3 = my_cached_fn()
      # Cache miss (different cohort), call_count should be 2
      self.assertEqual(call_count, 2)
      self.assertEqual(res3, "count: 2")

  def test_increment_decrement_partitioning(self):
    local_cache = Cache(
        self.app,
        config={
            'CACHE_TYPE': 'server.lib.cache.cohort_aware_simple_cache_factory'
        })

    # 1. Spanner cohort: initialize and increment
    with self.app.test_request_context():
      g.use_spanner = True
      local_cache.set("counter", 10)
      local_cache.cache.inc("counter", 2)
      self.assertEqual(local_cache.get("counter"), 12)

    # 2. BT cohort: initialize and increment independently
    with self.app.test_request_context():
      g.use_spanner = False
      local_cache.set("counter", 50)
      local_cache.cache.inc("counter", 5)
      self.assertEqual(local_cache.get("counter"), 55)

    # 3. Check values in respective cohorts
    with self.app.test_request_context():
      g.use_spanner = True
      self.assertEqual(local_cache.get("counter"), 12)
      local_cache.cache.dec("counter", 1)
      self.assertEqual(local_cache.get("counter"), 11)

    with self.app.test_request_context():
      g.use_spanner = False
      self.assertEqual(local_cache.get("counter"), 55)
      local_cache.cache.dec("counter", 1)
      self.assertEqual(local_cache.get("counter"), 54)
