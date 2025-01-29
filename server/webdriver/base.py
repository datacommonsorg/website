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
from server.webdriver import base_utils
from server.webdriver.base_utils import create_driver
from shared.lib.test_server import NLWebServerTestCase
from shared.lib.test_setup import set_up_macos_for_tests

set_up_macos_for_tests()


# Please refer to README.md to see the order of method execution during test.
class WebdriverBaseTest(NLWebServerTestCase):
  """Base test class to setup the server."""

  def setUp(self, preferences=None):
    """Runs at the beginning of every individual test."""
    # Maximum time, in seconds, before throwing a TimeoutException.
    self.TIMEOUT_SEC = base_utils.TIMEOUT
    self.driver = create_driver(preferences)
    # The URL of the Data Commons server.
    self.url_ = self.get_server_url()

  def tearDown(self):
    """Runs at the end of every individual test."""
    # Quit the ChromeDriver instance.
    # NOTE: Every individual test starts a new ChromeDriver instance.
    self.driver.quit()
