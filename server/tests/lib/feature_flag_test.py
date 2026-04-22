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
