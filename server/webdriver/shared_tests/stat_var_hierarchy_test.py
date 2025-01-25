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

import re

from selenium.webdriver.common.by import By

from server.webdriver import shared
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import wait_elem

MAP_URL = '/tools/map'


class StatVarHierarchyTestMixin():
  """Mixins to test the stat var hierarchy page."""

  def test_filter(self):
    """Test the stat var filtering based on place selection."""
    self.driver.get(self.url_ + MAP_URL)

    # Wait until stat var hierarchy is present
    self.assertIsNotNone(
        wait_elem(self.driver, by=By.ID, value='hierarchy-section'))

    # Get the count of the first category
    agriculture_category = find_elem(self.driver,
                                     by=By.XPATH,
                                     value="//*[text()='Agriculture']")
    count_text = find_elem(agriculture_category, value='sv-count').text

    rgx = re.compile(r'\(([0-9]+)\)')
    count_text = rgx.search(count_text).group(0)

    count_initial = int(count_text.replace('(', '').replace(')', ''))

    # Wait until search box is present and Type california
    search_box_input = find_elem(self.driver, by=By.ID, value='ac')
    search_box_input.send_keys('California')

    # Wait until there is at least one result in autocomplete results.
    self.assertIsNotNone(wait_elem(self.driver, value='pac-item'))

    # Click on the first result.
    find_elem(self.driver, by=By.CSS_SELECTOR,
              value='.pac-item:nth-child(1)').click()
    self.assertIsNotNone(wait_elem(self.driver, value='chip'))

    # Wait until the place type selector populates with options
    self.assertIsNotNone(
        wait_elem(self.driver,
                  by=By.CSS_SELECTOR,
                  value="option[value='County']"))

    # Select the 'County' place type option
    find_elem(self.driver, by=By.CSS_SELECTOR,
              value="option[value='County']").click()

    # Get the count after filtering
    shared.wait_for_loading(self.driver)

    agriculture_category = find_elem(self.driver,
                                     by=By.XPATH,
                                     value="//*[text()='Agriculture']")

    count_text = find_elem(agriculture_category,
                           by=By.CLASS_NAME,
                           value='sv-count').text
    count_text = rgx.search(count_text).group(0)

    count_filter = int(count_text.replace('(', '').replace(')', ''))

    self.assertGreater(count_initial, count_filter)
