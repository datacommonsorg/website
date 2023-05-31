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

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver_tests.base_test import WebdriverBaseTest
import server.webdriver_tests.shared as shared

MAP_URL = '/tools/map'


# Class to test stat var hierarchy component.
class TestMap(WebdriverBaseTest):

  def test_filter(self):
    """Test the stat var filtering based on place selection."""
    self.driver.get(self.url_ + MAP_URL)

    # Wait until stat var hierarchy is present
    element_present = EC.presence_of_element_located(
        (By.ID, 'hierarchy-section'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Get the count of the first category
    first_category = self.driver.find_element(By.CLASS_NAME, 'sv-count')
    count_text = first_category.text
    count_initial = int(count_text.replace('(', '').replace(')', ''))

    # Wait until search box is present.
    element_present = EC.presence_of_element_located((By.ID, 'ac'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    search_box_input = self.driver.find_element(By.ID, 'ac')

    # Type california into the search box.
    search_box_input.send_keys('California')

    # Wait until there is at least one result in autocomplete results.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'pac-item'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Click on the first result.
    first_result = self.driver.find_element(By.CSS_SELECTOR,
                                            '.pac-item:nth-child(1)')
    first_result.click()
    element_present = EC.presence_of_element_located((By.CLASS_NAME, 'chip'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Wait until the place type selector populates with options
    element_present = EC.presence_of_element_located(
        (By.CSS_SELECTOR, "option[value='County']"))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Select the 'County' place type option
    place_type = self.driver.find_element(By.CSS_SELECTOR,
                                          "option[value='County']")
    place_type.click()

    # Get the count after filtering
    shared.wait_for_loading(self.driver)
    first_category = self.driver.find_element(By.CLASS_NAME, 'sv-count')
    count_text = first_category.text
    count_filter = int(count_text.replace('(', '').replace(')', ''))

    self.assertGreater(count_initial, count_filter)
