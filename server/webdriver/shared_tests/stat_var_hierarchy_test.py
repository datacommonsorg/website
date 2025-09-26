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

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import wait_elem
from server.webdriver import shared

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
    agriculture_count_xpath = "//*[text()='Agriculture']/span[@class='sv-count']"
    initial_count_text = find_elem(self.driver,
                                   by=By.XPATH,
                                   value=agriculture_count_xpath).text

    rgx = re.compile(r'\(([0-9]+)\)')
    count_initial = int(rgx.search(initial_count_text).group(1))

    # Search for California Counties
    shared.search_for_places(self,
                             self.driver,
                             "California",
                             "County",
                             is_new_vis_tools=False)

    # Wait until we see a change in the agricultural count.
    try:
      WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
          lambda driver: initial_count_text not in driver.find_element(
              By.XPATH, agriculture_count_xpath).text)
    except TimeoutException:
      self.fail("Stat var count did not update after applying place filter.")

    # Get the count after filtering
    count_text_after = find_elem(self.driver,
                                 by=By.XPATH,
                                 value=agriculture_count_xpath).text
    count_final = int(rgx.search(count_text_after).group(1))

    self.assertGreater(count_initial, count_final)
