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

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_elem
import server.webdriver.shared as shared

MAP_URL = '/tools/map'
URL_HASH_1 = '#&sv=Median_Age_Person&pc=0&pd=geoId/06&pn=California&pt=State&ept=County'
PLACE_SEARCH_CA = 'California'


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

  def test_charts_from_url(self):
    """Given the url directly, test the page shows up correctly"""
    # Load Map Tool page with Statistical Variables.
    self.driver.get(self.url_ + MAP_URL + URL_HASH_1)

    # Wait until the chart has loaded.
    shared.wait_for_loading(self.driver)
    self.assertIsNotNone(wait_elem(self.driver, by=By.ID, value='map-items'))

    # Assert place name is correct.
    self.assertEqual(
        find_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="place-list"]/div/span').text, 'California')

    # Assert chart is correct.
    self.assertIn(
        'Median Age of Population ',
        find_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="map-chart"]/div/div[1]/h3').text)

    # Assert was have 58 map regions and 5 legends.
    chart_map = find_elem(self.driver, by=By.ID, value='map-items')
    self.assertEqual(len(find_elems(chart_map, by=By.TAG_NAME, value='path')),
                     58)
    chart_legend = find_elem(self.driver, by=By.ID, value='choropleth-legend')
    self.assertGreater(
        len(find_elems(chart_legend, by=By.CLASS_NAME, value='tick')), 5)

    # Click United States breadcrumb
    find_elem(self.driver,
              by=By.XPATH,
              value='//*[@id="chart-row"]/div/div/div/div[3]/div[3]/a').click()

    # Assert redirect was correct
    place_list = find_elem(self.driver, by=By.ID, value='place-list')
    shared.wait_for_loading(self.driver)
    self.assertEqual(
        find_elem(place_list, by=By.XPATH, value='./div/span').text,
        'United States of America')

    # Select State place type
    shared.wait_for_loading(self.driver)
    place_type_selector = find_elem(self.driver,
                                    by=By.ID,
                                    value='place-selector-place-type')
    place_type_selector.click()
    find_elem(place_type_selector, by=By.XPATH, value='./option[2]').click()

    # Assert that a map chart is loaded
    self.assertIsNotNone(wait_elem(self.driver, by=By.ID, value='map-items'))
    self.assertIn(
        "Median Age of Population ",
        find_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="map-chart"]/div/div[1]/h3').text)
    chart_map = find_elem(self.driver, by=By.ID, value='map-items')
    self.assertEqual(len(find_elems(chart_map, by=By.TAG_NAME, value='path')),
                     52)

    # Click explore timeline
    find_elem(self.driver, value='explore-timeline-text').click()

    # Assert rankings page loaded
    new_page_title = (
        'Ranking by Median Age - States in United States of America - Place ' +
        'Rankings - ' + self.dc_title_string)
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(new_page_title))
    self.assertEqual(new_page_title, self.driver.title)

  def test_manually_enter_options(self):
    """Test entering place and stat var options manually will cause chart to
        show up.
        """
    self.driver.get(self.url_ + MAP_URL)

    # Wait until search box is present and type California
    search_box_input = find_elem(self.driver, by=By.ID, value='ac')
    search_box_input.send_keys(PLACE_SEARCH_CA)

    # Wait until there is at least one result in autocomplete results.
    wait_elem(self.driver, value='pac-item')

    # Click on the first result.

    first_result = find_elem(self.driver,
                             by=By.CSS_SELECTOR,
                             value='.pac-item:nth-child(1)')
    first_result.click()
    wait_elem(self.driver, value='chip')

    # Wait until place type selector populates with options. Click on 'County'.
    find_elem(self.driver, by=By.CSS_SELECTOR,
              value="option[value='County']").click()

    # Choose stat var
    shared.wait_for_loading(self.driver)
    shared.click_sv_group(self.driver, "Demographics")
    find_elem(
        self.driver,
        by=By.ID,
        value='Median_Age_Persondc/g/Demographics-Median_Age_Person').click()

    # Assert chart is correct.
    shared.wait_for_loading(self.driver)
    chart_map = find_elem(self.driver, by=By.ID, value='map-items')
    self.assertIn(
        'Median Age of Population ',
        find_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="map-chart"]/div/div[1]/h3').text)

    # Assert we have the right number of regions and legends
    self.assertEqual(len(find_elems(chart_map, by=By.TAG_NAME, value='path')),
                     58)
    chart_legend = self.driver.find_element(By.ID, 'choropleth-legend')
    self.assertGreater(len(find_elems(chart_legend, value='tick')), 5)

  def test_landing_page_link(self):
    """Test for landing page link."""
    self.driver.get(self.url_ + MAP_URL)

    # Click on first link on landing page
    placeholder_container = find_elem(self.driver,
                                      by=By.ID,
                                      value='placeholder-container')
    find_elem(placeholder_container, by=By.XPATH,
              value='./ul/li[2]/a[1]').click()

    # Assert chart loads
    shared.wait_for_loading(self.driver)
    chart_map = find_elem(self.driver, by=By.ID, value='map-items')
    self.assertGreater(len(find_elems(chart_map, by=By.TAG_NAME, value='path')),
                       1)
