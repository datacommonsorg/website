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
from server.webdriver.base_utils import LONG_TIMEOUT
from server.webdriver.base_utils import wait_elem
import server.webdriver.shared as shared

# TODO(juliawu): Remove feature flags once new UI is rolled out to production
MAP_URL = '/tools/map'
URL_HASH_1 = '#&sv=Median_Age_Person&pc=0&pd=geoId/06&pn=California&pt=State&ept=County'


class MapTestMixin():
  """Mixins to test the map page."""

  def test_server_and_page(self):
    """Test the server can run successfully."""
    title_text = "Map Explorer - " + self.dc_title_string
    self.driver.get(self.url_ + MAP_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/map.js'), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

  def test_can_enter_a_place_and_place_type(self):
    """Test that a place can be entered in the place search bar"""
    # Load map page and wait for it to load
    self.driver.get(self.url_ + MAP_URL)
    shared.wait_for_loading(self.driver)

    # Attempt to search for California counties
    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type="County",
                             is_new_vis_tools=False)

    # Assert these values are in the URL
    current_url = self.driver.current_url
    self.assertTrue("pd%3DgeoId%2F06" in current_url)  # look for "pd=geoId/06"
    self.assertTrue("ept%3DCounty" in current_url)  # look for "ept=County"

  @pytest.mark.one_at_a_time
  def test_manually_enter_options_results_in_chart(self):
    """Test entering place and stat var options manually will cause chart to
        show up.
        """
    self.driver.get(self.url_ + MAP_URL)

    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type="County",
                             is_new_vis_tools=False)

    # Choose stat var
    shared.click_sv_group(self.driver, "Demographics")
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    # Wait for chart to load
    shared.wait_for_loading(self.driver)
    shared.wait_for_charts_to_render(self.driver,
                                     timeout_seconds=self.TIMEOUT_SEC)

    # Assert chart is correct.
    self.assertIn(
        'median age of population ',
        find_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="map-chart"]/div/div[1]/h3').text.lower())

    # Assert we have the right number of regions and legends
    self.assertEqual(
        len(find_elems(self.driver, by=By.CSS_SELECTOR,
                       value='#map-items path')), 58)
    wait_elem(self.driver, By.CLASS_NAME, 'tick')
    self.assertGreater(
        len(
            find_elems(self.driver,
                       by=By.CSS_SELECTOR,
                       value='#choropleth-legend .tick')), 5)
