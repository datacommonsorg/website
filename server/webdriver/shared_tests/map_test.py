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
import urllib
import urllib.request

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

import server.webdriver.shared as shared

MAP_URL = '/tools/map'
URL_HASH_1 = '#&sv=Median_Age_Person&pc=0&pd=geoId/06&pn=California&pt=State&ept=County'
PLACE_SEARCH_CA = 'California'

class MapTestMixin():
    """Mixins to test the map page."""

    def test_server_and_page(self):
        """Test the server can run successfully."""
        title_text = "Map Explorer - " + self.DATACOMMONS_STRING
        self.driver.get(self.url_ + MAP_URL)

        # Assert 200 HTTP code: successful page load.
        req = urllib.request.Request(self.driver.current_url)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.getcode(), 200)

        # Assert 200 HTTP code: successful JS generation.
        req = urllib.request.Request(self.url_ + '/map.js')
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.getcode(), 200)

        # Assert page title is correct.
        WebDriverWait(self.driver,
                    self.TIMEOUT_SEC).until(EC.title_contains(title_text))
        self.assertEqual(title_text, self.driver.title)

    def test_charts_from_url(self):
        """Given the url directly, test the page shows up correctly"""
        # Load Map Tool page with Statistical Variables.
        self.driver.get(self.url_ + MAP_URL + URL_HASH_1)

        # Wait until the chart has loaded.
        element_present = EC.presence_of_element_located((By.ID, 'map-items'))
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

        # Assert place name is correct.
        place_name = self.driver.find_element(By.XPATH,
                                            '//*[@id="place-list"]/div/span')
        self.assertEqual(place_name.text, 'California')

        # Assert chart is correct.
        element_present = EC.presence_of_element_located((By.ID, 'map-items'))
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
        chart_title = self.driver.find_element(
            By.XPATH, '//*[@id="map-chart"]/div/div[1]/h3')
        self.assertEqual(chart_title.text, "Median Age of Population (2022)")
        chart_map = self.driver.find_element(By.ID, 'map-items')
        map_regions = chart_map.find_elements(By.TAG_NAME, 'path')
        self.assertEqual(len(map_regions), 58)
        chart_legend = self.driver.find_element(By.ID, 'choropleth-legend')
        legend_ticks = chart_legend.find_elements(By.CLASS_NAME, 'tick')
        self.assertGreater(len(legend_ticks), 5)

        # Click United States breadcrumb
        self.driver.find_element(
            By.XPATH, '//*[@id="chart-row"]/div/div/div/div[3]/div[3]/a').click()

        # Assert redirect was correct
        element_present = EC.text_to_be_present_in_element(
            (By.XPATH, '//*[@id="place-list"]/div/span'),
            'United States of America')
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
        place_name = self.driver.find_element(By.XPATH,
                                            '//*[@id="place-list"]/div/span')
        self.assertEqual(place_name.text, 'United States of America')

        # Select State place type
        element_present = EC.text_to_be_present_in_element(
            (By.ID, 'place-selector-place-type'), "State")
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
        self.driver.find_element(By.ID, 'place-selector-place-type').click()
        self.driver.find_element(
            By.XPATH, '//*[@id="place-selector-place-type"]/option[2]').click()

        # Assert that a map chart is loaded
        element_present = EC.presence_of_element_located((By.ID, 'map-items'))
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
        chart_title = self.driver.find_element(
            By.XPATH, '//*[@id="map-chart"]/div/div[1]/h3')
        self.assertEqual(chart_title.text, "Median Age of Population (2022)")
        chart_map = self.driver.find_element(By.ID, 'map-items')
        map_regions = chart_map.find_elements(By.TAG_NAME, 'path')
        self.assertEqual(len(map_regions), 52)

        # Click explore timeline
        self.driver.find_element(By.CLASS_NAME, 'explore-timeline-text').click()

        # Assert rankings page loaded
        new_page_title = ('Ranking by Median Age - States in United States of America - Place '
                          + 'Rankings - ' + self.DATACOMMONS_STRING)
        WebDriverWait(self.driver,
                    self.TIMEOUT_SEC).until(EC.title_contains(new_page_title))
        self.assertEqual(new_page_title, self.driver.title)

    def test_manually_enter_options(self):
        """Test entering place and stat var options manually will cause chart to
        show up.
        """
        self.driver.get(self.url_ + MAP_URL)

        # Wait until search box is present.
        element_present = EC.presence_of_element_located((By.ID, 'ac'))
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
        search_box_input = self.driver.find_element(By.ID, 'ac')

        # Type california into the search box.
        search_box_input.send_keys(PLACE_SEARCH_CA)

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

        # Wait until place type selector populates with options
        element_present = EC.presence_of_element_located(
            (By.CSS_SELECTOR, "option[value='County']"))
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

        # Click on 'County' place type option
        place_type = self.driver.find_element(By.CSS_SELECTOR,
                                            "option[value='County']")
        place_type.click()

        # Choose stat var
        shared.wait_for_loading(self.driver)
        shared.click_sv_group(self.driver, "Demographics")
        element_present = EC.presence_of_element_located(
            (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
        self.driver.find_element(
            By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person').click()

        # Assert chart is correct.
        element_present = EC.presence_of_element_located((By.ID, 'map-items'))
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
        chart_title = self.driver.find_element(
            By.XPATH, '//*[@id="map-chart"]/div/div[1]/h3')
        self.assertEqual(chart_title.text, "Median Age of Population (2022)")
        chart_map = self.driver.find_element(By.ID, 'map-items')
        map_regions = chart_map.find_elements(By.TAG_NAME, 'path')
        self.assertEqual(len(map_regions), 58)
        chart_legend = self.driver.find_element(By.ID, 'choropleth-legend')
        legend_ticks = chart_legend.find_elements(By.CLASS_NAME, 'tick')
        self.assertGreater(len(legend_ticks), 5)

    def test_landing_page_link(self):
        """Test for landing page link."""
        self.driver.get(self.url_ + MAP_URL)

        # Click on first link on landing page
        element_present = EC.presence_of_element_located(
            (By.ID, 'placeholder-container'))
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
        self.driver.find_element(
            By.XPATH, '//*[@id="placeholder-container"]/ul/li[2]/a[1]').click()

        # Assert chart loads
        shared.wait_for_loading(self.driver)
        element_present = EC.presence_of_element_located((By.ID, 'map-items'))
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
        chart_map = self.driver.find_element(By.ID, 'map-items')
        map_regions = chart_map.find_elements(By.TAG_NAME, 'path')
        self.assertGreater(len(map_regions), 1)
