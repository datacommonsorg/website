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

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_elem
import server.webdriver.shared as shared

# TODO(juliawu): Remove feature flags once new UI is rolled out to production
TIMELINE_URL = '/tools/timeline'
URL_HASH_1 = '#&statsVar=Median_Age_Person__Median_Income_Person__Count_Person_Upto5Years'\
    '__Count_Person_5To17Years&place=geoId/06,geoId/08'
GEO_URL_1 = '#&place=geoId/06'
STATVAR_URL_1 = '#&statsVar=Count_Person'
PLACE_SEARCH_CA = 'California, USA'
PLACE_SEARCH_USA = 'USA'


class TimelineTestMixin():

  def test_server_and_page(self):
    """Test the server can run successfully."""
    title_text = "Timelines Explorer - " + self.dc_title_string
    self.driver.get(self.url_ + TIMELINE_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/timeline.js'), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

  def test_can_enter_and_remove_places(self):
    """Test that multiple places can be entered in the place search bar and
    that removing a chip also removes the place."""
    # Load map page and wait for it to load
    self.driver.get(self.url_ + TIMELINE_URL)
    shared.wait_for_loading(self.driver)

    # Search for California
    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type=None,
                             is_new_vis_tools=False)

    # Assert these values are in the URL
    current_url = self.driver.current_url
    self.assertTrue("place=geoId%2F06"
                    in current_url)  # look for "place=geoId/06"

    # Search for Texas
    shared.search_for_places(self,
                             self.driver,
                             search_term="Texas",
                             place_type=None,
                             is_new_vis_tools=False)

    # Assert both California and Texas are in the URL
    current_url = self.driver.current_url
    self.assertTrue("geoId%2F06" in current_url)  # look for "geoId/06"
    self.assertTrue("geoId%2F48" in current_url)  # look for "geoId/48"

    # Remove California by clicking the X on the chip
    # California is the first chip
    shared.click_el(self.driver, (By.CLASS_NAME, "chip-action"))

    # Assert only Texas is in the URL
    current_url = self.driver.current_url
    self.assertTrue("geoId%2F48" in current_url)  # look for "geoId/48"
    self.assertFalse("geoId%2F06"
                     in current_url)  # "geoId/06" should be removed from url

  @pytest.mark.one_at_a_time
  def test_manually_enter_options_results_in_chart(self):
    """Test entering place and stat var options manually will cause chart to
    show up.
    """
    self.driver.get(self.url_ + TIMELINE_URL)

    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type=None,
                             is_new_vis_tools=False)

    # Choose stat var
    shared.click_sv_group(self.driver, "Demographics")
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    shared.wait_for_loading(self.driver)

    # Wait for chart-region and lines within to load
    shared.wait_for_charts_to_render(self.driver,
                                     timeout_seconds=self.TIMEOUT_SEC)

    # Assert number of charts and lines is correct.
    charts = find_elems(self.driver,
                        by=By.XPATH,
                        value='//*[@id="chart-region"]/div')
    self.assertEqual(len(charts), 1)
    lines = find_elems(charts[0], value="line")
    self.assertEqual(len(lines), 1)
