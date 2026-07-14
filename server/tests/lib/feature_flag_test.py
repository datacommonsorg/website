# Copyright 2025 Google LLC
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

# Tests for feature flag utility functions

import unittest

from server.__init__ import create_app
from server.lib.feature_flags import FEATURE_FLAG_URL_OVERRIDE_DISABLE_PARAM
from server.lib.feature_flags import FEATURE_FLAG_URL_OVERRIDE_ENABLE_PARAM
from server.lib.feature_flags import is_feature_enabled
from server.lib.feature_flags import is_feature_override_disabled
from server.lib.feature_flags import is_feature_override_enabled
from server.tests.utils import mock_feature_flags

TEST_FEATURE_FLAG = "test_feature_flag"


class TestFeatureFlags(unittest.TestCase):
  """Test suite for feature_flags.py"""

  @classmethod
  def setUpClass(cls):
    cls.app = create_app()
    cls.client = cls.app.test_client()

  @classmethod
  def tearDownClass(cls):
    cls.app = None
    cls.client = None

  def test_is_feature_override_enabled_helper(self):
    """Tests the is_feature_override_enabled helper function."""
    # Return True if request includes enable override
    response = self.client.get(
        f"/?{FEATURE_FLAG_URL_OVERRIDE_ENABLE_PARAM}={TEST_FEATURE_FLAG}")
    self.assertTrue(
        is_feature_override_enabled(TEST_FEATURE_FLAG,
                                    request=response.request))
    # Return False if request does not include enable override
    response = self.client.get(
        f"/?{FEATURE_FLAG_URL_OVERRIDE_ENABLE_PARAM}=INVALID_{TEST_FEATURE_FLAG}"
    )
    self.assertFalse(
        is_feature_override_enabled(TEST_FEATURE_FLAG,
                                    request=response.request))
    # Return False if request is not provided
    self.assertFalse(
        is_feature_override_enabled(TEST_FEATURE_FLAG, request=None))

  def test_is_feature_override_disabled_helper(self):
    """Tests the is_feature_override_disabled helper function."""
    # Return True if request includes disable override
    response = self.client.get(
        f"/?{FEATURE_FLAG_URL_OVERRIDE_DISABLE_PARAM}={TEST_FEATURE_FLAG}")
    self.assertTrue(
        is_feature_override_disabled(TEST_FEATURE_FLAG,
                                     request=response.request))
    # Return False if request does not include disable override
    response = self.client.get(
        f"/?{FEATURE_FLAG_URL_OVERRIDE_DISABLE_PARAM}=INVALID_{TEST_FEATURE_FLAG}"
    )
    self.assertFalse(
        is_feature_override_disabled(TEST_FEATURE_FLAG,
                                     request=response.request))
    # Return False if request is not provided
    self.assertFalse(
        is_feature_override_disabled(TEST_FEATURE_FLAG, request=None))

  def test_feature_flag_enabled_by_app_config(self):
    """Should return true if feature flag is enabled in config"""
    mock_feature_flags(self.app, [TEST_FEATURE_FLAG], True)
    self.assertTrue(is_feature_enabled(TEST_FEATURE_FLAG, app=self.app))

  def test_feature_flag_disabled_when_not_in_config(self):
    """Should default to False if feature is not in config."""
    self.assertFalse(is_feature_enabled(TEST_FEATURE_FLAG, app=self.app))

  def test_feature_flag_experimental_rollout(self):
    """Should return True if feature flag is in rollout and False otherwise"""
    # 0% rollout should be disabled
    mock_feature_flags(self.app, [TEST_FEATURE_FLAG], True, rolloutPercent=0)
    self.assertFalse(is_feature_enabled(TEST_FEATURE_FLAG, app=self.app))
    # 100% rollout should be enabled
    mock_feature_flags(self.app, [TEST_FEATURE_FLAG], True, rolloutPercent=100)
    self.assertTrue(is_feature_enabled(TEST_FEATURE_FLAG, app=self.app))

  def test_url_enable_override_wins_over_config(self):
    """Should return True if URL enable override is provided"""
    # Config says False but request says True
    response = self.client.get(
        f"/?{FEATURE_FLAG_URL_OVERRIDE_ENABLE_PARAM}={TEST_FEATURE_FLAG}")
    # The override should win
    self.assertTrue(
        is_feature_enabled(TEST_FEATURE_FLAG,
                           app=self.app,
                           request=response.request))

  def test_url_disable_override_wins_over_config(self):
    """Should return False if URL disable override is provided"""
    # Config says True
    mock_feature_flags(self.app, [TEST_FEATURE_FLAG], True)
    # But request says False
    response = self.client.get(
        f"/?{FEATURE_FLAG_URL_OVERRIDE_DISABLE_PARAM}={TEST_FEATURE_FLAG}")
    # The override should win
    self.assertFalse(
        is_feature_enabled(TEST_FEATURE_FLAG,
                           app=self.app,
                           request=response.request))

  def test_spanner_diversion_cohort_assignment(self):
    """Test deterministic cohort assignment for divert_to_spanner."""
    from flask import g

    mock_feature_flags(self.app, ["divert_to_spanner"], True, rolloutPercent=50)

    # Request 1: IP '192.168.1.1', UA 'Mozilla/5.0'
    with self.client as c:
      c.get('/',
            headers={
                'X-Forwarded-For': '192.168.1.1',
                'User-Agent': 'Mozilla/5.0'
            })
      val1 = g.use_spanner

    # Request 2: Same IP and UA -> must return the exact same cohort assignment
    with self.client as c:
      c.get('/',
            headers={
                'X-Forwarded-For': '192.168.1.1',
                'User-Agent': 'Mozilla/5.0'
            })
      val2 = g.use_spanner

    self.assertEqual(val1, val2)

    # Verify that the leftmost IP (representing original client IP) is used.
    # Request 3: IP '192.168.1.1', with downstream proxy IPs '10.0.0.1, 10.0.0.2'
    with self.client as c:
      c.get('/',
            headers={
                'X-Forwarded-For': '192.168.1.1, 10.0.0.1, 10.0.0.2',
                'User-Agent': 'Mozilla/5.0'
            })
      val3 = g.use_spanner

    self.assertEqual(val1, val3)

    # Verify IPv4 port stripping: "192.168.1.1:12345" and "192.168.1.1" must result in identical values
    from unittest.mock import MagicMock

    from server.lib.feature_flags import assign_spanner_cohort

    def make_mock_req(ip_header, ua='Mozilla/5.0'):
      req = MagicMock()
      req.headers = {}
      if ip_header:
        req.headers['X-Forwarded-For'] = ip_header
      req.headers['User-Agent'] = ua
      req.remote_addr = '127.0.0.1'
      return req

    self.assertEqual(
        assign_spanner_cohort(self.app, make_mock_req("192.168.1.1:12345")),
        assign_spanner_cohort(self.app, make_mock_req("192.168.1.1")))

    # Verify IPv6 bracketed port stripping: "[2001:db8::1]:12345" and "[2001:db8::1]"
    self.assertEqual(
        assign_spanner_cohort(self.app, make_mock_req("[2001:db8::1]:12345")),
        assign_spanner_cohort(self.app, make_mock_req("[2001:db8::1]")))

    # Verify that override query params work
    with self.client as c:
      c.get('/?enable_feature=divert_to_spanner')
      self.assertTrue(g.use_spanner)

    with self.client as c:
      c.get('/?disable_feature=divert_to_spanner')
      self.assertFalse(g.use_spanner)

  def test_spanner_diversion_ip_overrides(self):
    """Test cohort overrides based on client IP addresses/subnets."""
    from flask import g

    from server.lib.feature_flags import assign_spanner_cohort

    # 1. Force to Spanner cohort (0% rollout, but IP is overridden to Spanner)
    mock_feature_flags(self.app, ["divert_to_spanner"], True, rolloutPercent=0)
    self.app.config["DB_COHORT_FORCE_SPANNER_IPS"] = "192.168.1.1,10.0.0.0/8"
    self.app.config["DB_COHORT_FORCE_NON_SPANNER_IPS"] = ""

    with self.client as c:
      c.get('/', headers={'X-Forwarded-For': '192.168.1.1'})
      self.assertTrue(g.use_spanner)

    with self.client as c:
      c.get('/',
            headers={'X-Forwarded-For': '10.5.2.3'})  # matches CIDR 10.0.0.0/8
      self.assertTrue(g.use_spanner)

    with self.client as c:
      c.get('/', headers={'X-Forwarded-For': '192.168.1.2'})  # does not match
      self.assertFalse(g.use_spanner)

    # 2. Force to Non-Spanner cohort (100% rollout, but IP is overridden to non-Spanner)
    mock_feature_flags(self.app, ["divert_to_spanner"],
                       True,
                       rolloutPercent=100)
    self.app.config["DB_COHORT_FORCE_SPANNER_IPS"] = ""
    self.app.config[
        "DB_COHORT_FORCE_NON_SPANNER_IPS"] = "192.168.1.1,10.0.0.0/8"

    with self.client as c:
      c.get('/', headers={'X-Forwarded-For': '192.168.1.1'})
      self.assertFalse(g.use_spanner)

    with self.client as c:
      c.get('/',
            headers={'X-Forwarded-For': '10.5.2.3'})  # matches CIDR 10.0.0.0/8
      self.assertFalse(g.use_spanner)

    with self.client as c:
      c.get('/', headers={'X-Forwarded-For': '192.168.1.2'})  # does not match
      self.assertTrue(g.use_spanner)

    # 3. URL Parameter Precedence (URL parameter wins over IP override)
    mock_feature_flags(self.app, ["divert_to_spanner"], True, rolloutPercent=0)
    self.app.config["DB_COHORT_FORCE_SPANNER_IPS"] = "192.168.1.1"
    self.app.config["DB_COHORT_FORCE_NON_SPANNER_IPS"] = ""
    with self.client as c:
      # IP says yes, but URL disable override says no
      c.get('/?disable_feature=divert_to_spanner',
            headers={'X-Forwarded-For': '192.168.1.1'})
      self.assertFalse(g.use_spanner)

    mock_feature_flags(self.app, ["divert_to_spanner"],
                       True,
                       rolloutPercent=100)
    self.app.config["DB_COHORT_FORCE_SPANNER_IPS"] = ""
    self.app.config["DB_COHORT_FORCE_NON_SPANNER_IPS"] = "192.168.1.1"
    with self.client as c:
      # IP says no, but URL enable override says yes
      c.get('/?enable_feature=divert_to_spanner',
            headers={'X-Forwarded-For': '192.168.1.1'})
      self.assertTrue(g.use_spanner)

    # 4. Conflict Precedence (non-Spanner override wins if IP is in both)
    mock_feature_flags(self.app, ["divert_to_spanner"], True, rolloutPercent=50)
    self.app.config["DB_COHORT_FORCE_SPANNER_IPS"] = "192.168.1.1"
    self.app.config["DB_COHORT_FORCE_NON_SPANNER_IPS"] = "192.168.1.1"
    with self.client as c:
      c.get('/', headers={'X-Forwarded-For': '192.168.1.1'})
      self.assertFalse(g.use_spanner)

    # Clean up configs
    self.app.config["DB_COHORT_FORCE_SPANNER_IPS"] = ""
    self.app.config["DB_COHORT_FORCE_NON_SPANNER_IPS"] = ""
