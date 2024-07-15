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

from selenium.webdriver.common.by import By

from server.webdriver import shared
from server.webdriver.base_utils import create_driver
from server.webdriver.cdc_tests.cdc_tests_utils import find_elem
from server.webdriver.cdc_tests.cdc_tests_utils import wait_elem

# From project datcom-website-dev > Cloud Run: dc-autopush > Revisions
CDC_AUTOPUSH_URL = 'https://dc-autopush-kqb7thiuka-uc.a.run.app'


class CdcAutopushTest(unittest.TestCase):

  def setUp(self, preferences=None):
    """Runs at the beginning of every individual test."""
    # Maximum time, in seconds, before throwing a TimeoutException.
    self.TIMEOUT_SEC = shared.TIMEOUT
    self.driver = create_driver(preferences)
    self._base_url = CDC_AUTOPUSH_URL

  def tearDown(self):
    """Runs at the end of every individual test."""
    # Quit the ChromeDriver instance.
    # NOTE: Every individual test starts a new ChromeDriver instance.
    self.driver.quit()

  def test_homepage_load(self):
    """Tests that the base autopush URL loads successfully."""
    self.driver.get(self._base_url)

    homepage_elem = find_elem(self.driver, By.ID, 'homepage')
    self.assertIsNotNone(homepage_elem, 'Homepage element not found')

  def test_statvar_explorer(self):
    self.driver.get(f'{self._base_url}/tools/statvar')

    svg_container_elem = find_elem(self.driver, By.CLASS_NAME,
                                   'stat-var-hierarchy-container')
    self.assertIsNotNone(svg_container_elem, 'SVG container element not found')

    custom_svg_elem = wait_elem(svg_container_elem, By.XPATH,
                                '//*[contains(text(), "OECD")]')
    self.assertIsNotNone(custom_svg_elem, 'Custom SVG (OECD) element not found')

    custom_svg_elem.click()
    custom_sv_elem = wait_elem(custom_svg_elem, By.XPATH,
                               '//*[contains(text(), "Average Annual Wage")]')
    self.assertIsNotNone(custom_sv_elem,
                         'Custom SV (Average Annual Wage) element not found')
