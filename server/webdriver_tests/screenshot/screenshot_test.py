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

import json
import os
import urllib.parse

from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver_tests.base_test import WebdriverBaseTest

# TODO(shifucun): add test for narrow width for mobile testing
WIDTH = 1280
SCREENSHOTS_FOLDER = 'screenshots'
CHART_HOLDER_CLASS = 'dc-chart-holder'
CHART_EXIST_CLASS = 'dc-chart-exist'


def wait_for_charts(driver):
  element_present = EC.presence_of_element_located(
      (By.CLASS_NAME, CHART_HOLDER_CLASS))
  WebDriverWait(driver, 30).until(element_present)
  chart_containers = driver.find_elements(By.CLASS_NAME, CHART_HOLDER_CLASS)
  for c in chart_containers:
    try:
      c.find_element(By.CLASS_NAME, CHART_EXIST_CLASS)
    except NoSuchElementException:
      return False
  return True


# Class to test screenshot capture.
class TestScreenShot(WebdriverBaseTest):

  def test_pages_and_sreenshot(self):
    """Test these page can show correctly and do screenshot."""
    with open(
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     'test_page.json')) as f:
      data = json.load(f)
      for test_info in data:
        self.driver.get(self.url_ + test_info['url'])

        name = urllib.parse.quote_plus(test_info['url'].removeprefix('/'))
        # Set the window size. Testing different sizes.
        self.driver.set_window_size(width=WIDTH,
                                    height=test_info['height'],
                                    windowHandle='current')
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(wait_for_charts)
        # Take a screenshot of the page and save it.
        file_name = '{}/{}.png'.format(SCREENSHOTS_FOLDER, name)
        self.assertTrue(self.driver.save_screenshot(file_name))
