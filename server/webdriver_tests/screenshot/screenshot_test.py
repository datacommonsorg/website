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

import logging
import urllib.parse

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver_tests.base_test import WebdriverBaseTest

# TODO(shifucun): add test for narrow width for mobile testing
WIDTH = 1280

SCREENSHOTS_FOLDER = 'screenshots'
# TODO: Can add more urls and tests if necessary.
TEST_URLS = [
    {
        'url': '/place/country/USA?topic=Demographics',
        'selector': By.CLASS_NAME,
        'name': 'chart-container',
        'height': 4400
    },
    {
        'url':
            '/tools/timeline#&place=geoId/0606000,geoId/2511000&statsVar=Median_Age_Person',
        'selector':
            By.CLASS_NAME,
        'name':
            'chart-area',
        'height':
            1000
    },
    {
        'url': '/ranking/Median_Income_Person/County/country/USA',
        'selector': By.CLASS_NAME,
        'name': 'chart-container',
        'height': 1080
    },
    {
        'url':
            '/tools/map#%26sv%3DAnnual_Emissions_CarbonDioxide_NonBiogenic%26pc%3D0%26denom%3DCount_Person%26pd%3Dcountry%2FUSA%26ept%3DState%26ppt%3DEpaReportingFacility',
        'selector':
            By.ID,
        'name':
            'map-items',
        'height':
            1080
    },
]


# Class to test timeline tool.
class TestScreenShot(WebdriverBaseTest):

  def test_pages_and_sreenshot(self):
    """Test these page can show correctly and do screenshot."""
    for _, test_info in enumerate(TEST_URLS):
      self.driver.get(self.url_ + test_info['url'])

      name = urllib.parse.quote_plus(test_info['url'].removeprefix('/'))

      # Wait until the test_class_name has loaded.
      element_present = EC.presence_of_element_located(
          (test_info['selector'], test_info['name']))

      try:
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
      except Exception as e:
        logging.error(test_info['url'])
        raise e

      # Set the window size. Testing different sizes.
      self.driver.set_window_size(width=WIDTH,
                                  height=test_info['height'],
                                  windowHandle='current')

      # Get the element to test.
      charts = self.driver.find_elements(test_info['selector'],
                                         test_info['name'])

      # Assert there is at least one chart.
      self.assertGreater(len(charts), 0, test_info['url'])

      # Take a screenshot of the page and save it.
      file_name = '{}/{}.png'.format(SCREENSHOTS_FOLDER, name)
      self.assertTrue(self.driver.save_screenshot(file_name))
