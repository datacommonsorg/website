# Copyright 2024 Google LLC
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
import urllib
import urllib.request

from server.webdriver import shared
from server.webdriver.base_utils import create_driver

# From project datcom-website-dev > Cloud Run: dc-autopush > Revisions
CDC_AUTOPUSH_URL = 'https://dc-autopush-kqb7thiuka-uc.a.run.app'


class CdcAutopushTest(unittest.TestCase):

  def setUp(self, preferences=None):
    """Runs at the beginning of every individual test."""
    # Maximum time, in seconds, before throwing a TimeoutException.
    self.TIMEOUT_SEC = shared.TIMEOUT
    self.driver = create_driver(preferences)
    self.url_ = CDC_AUTOPUSH_URL

  def tearDown(self):
    """Runs at the end of every individual test."""
    # Quit the ChromeDriver instance.
    # NOTE: Every individual test starts a new ChromeDriver instance.
    self.driver.quit()

  def test_homepage_load(self):
    """Tests that the base autopush URL loads successfully."""
    self.driver.get(self.url_)
    url = self.driver.current_url
    if not url.lower().startswith('http'):
      raise ValueError(f'Invalid scheme in {url}. Expected http(s)://.')
    req = urllib.request.Request(url)

    # Disable Bandit security check 310. http scheme is already checked above.
    # Codacity still calls out the error so disable the check.
    # https://bandit.readthedocs.io/en/latest/blacklists/blacklist_calls.html#b310-urllib-urlopen
    with urllib.request.urlopen(req) as response:  # nosec B310
      self.assertEqual(response.getcode(), 200)
