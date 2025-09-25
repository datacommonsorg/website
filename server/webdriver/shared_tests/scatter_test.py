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
SCATTER_URL = '/tools/scatter?disable_feature=standardized_vis_tool'
STANDARDIZED_SCATTER_URL = '/tools/scatter?enable_feature=standardized_vis_tool'
URL_HASH_1 = '#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy='\
    'Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1'\
    '&epd=geoId/06&epn=California&ept=County'

# Scatter plots can take extra long to load
# This is a custom, longer timeout to use for charts we know are slow
LONG_TIMEOUT = 90  # seconds


class ScatterTestMixin():
  """Mixins to test the scatter page."""

  def test_server_and_page(self):
    """Test the server can run successfully."""
    title_text = "Scatter Plot Explorer - " + self.dc_title_string
    self.driver.get(self.url_ + SCATTER_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/scatter.js'), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

  def test_charts_from_url(self):
    """Given the url directly, test the page shows up correctly"""
    # Load Scatter Tool page with Statistical Variables.
    self.driver.get(self.url_ + SCATTER_URL + URL_HASH_1)

    # Wait until the chart has loaded.
    shared.wait_for_loading(self.driver)
    scatterplot = find_elem(self.driver, by=By.ID, value='scatterplot')
    self.assertIsNotNone(scatterplot)

    # Assert place name is correct.
    self.assertEqual(
        find_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="place-list"]/div/span').text, 'California')

    # Assert chart is correct.
    chart = find_elem(self.driver,
                      by=By.CSS_SELECTOR,
                      value='#chart .chart-card .chart-title')
    self.assertIn("Population Asian Alone Per Capita ",
                  find_elem(chart, by=By.XPATH, value='./h3[1]').text)
    self.assertIn("Median Income of a Population ",
                  find_elem(chart, by=By.XPATH, value='./h3[2]').text)
    circles = find_elems(scatterplot, by=By.TAG_NAME, value='circle')
    self.assertGreater(len(circles), 20)

  @pytest.mark.one_at_a_time
  def test_manually_enter_options(self):
    """Test entering place and stat var options manually will cause chart to
    show up.
    """
    self.driver.get(self.url_ + SCATTER_URL)
    shared.wait_for_loading(self.driver)

    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type="County",
                             is_new_vis_tools=False)

    # Choose stat vars
    shared.click_sv_group(self.driver, "Demographics")

    # Click on median age
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    # Click on median income
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Income_Persondc/g/Demographics-Median_Income_Person'))

    # Assert chart title correct.
    wait_elem(self.driver, by=By.ID, value='scatterplot')
    chart = find_elem(self.driver,
                      by=By.CSS_SELECTOR,
                      value='#chart .chart-card .chart-title')
    self.assertIn("median income of a population ",
                  find_elem(chart, by=By.XPATH, value='./h3[1]').text.lower())
    self.assertIn("median age of population ",
                  find_elem(chart, by=By.XPATH, value='./h3[2]').text.lower())

    # Assert chart loads
    wait_elem(self.driver, By.TAG_NAME, 'circle')
    circles = find_elems(self.driver,
                         by=By.CSS_SELECTOR,
                         value='#scatterplot circle')
    self.assertGreater(len(circles), 20)

  def test_landing_page_link(self):
    self.driver.get(self.url_ + SCATTER_URL)

    # Click on first link on landing page
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.XPATH, '//*[@id="placeholder-container"]/ul/li[1]/a[1]'))

    # Wait for chart to load
    # This chart can be particularly slow, so use extra wait time
    shared.wait_for_loading(self.driver, timeout_seconds=LONG_TIMEOUT)
    wait_elem(self.driver, By.ID, 'chart-row', timeout_seconds=LONG_TIMEOUT)
    # Assert that circles load
    circles = wait_elem(self.driver,
                        By.CSS_SELECTOR,
                        '#scatterplot circle',
                        timeout_seconds=LONG_TIMEOUT)

    # Assert chart is correct
    self.assertIsNotNone(circles)


class StandardizedScatterTestMixin():
  """Mixins to test the new standardized map tool UI"""

  def test_server_and_page(self):
    """Test the server can run successfully."""
    title_text = "Scatter Plot Explorer - " + self.dc_title_string
    self.driver.get(self.url_ + STANDARDIZED_SCATTER_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/map.js'), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

  def test_can_enter_a_place_and_place_type(self):
    """Test that a place and place type can be successfully entered"""
    # Load map page and wait for it to load
    self.driver.get(self.url_ + STANDARDIZED_SCATTER_URL)
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
  def test_manually_enter_options_results_in_scatter_chart(self):
    """Test entering place and stat var options manually will cause a scatter
    chart to show up.
    """
    self.driver.get(self.url_ + STANDARDIZED_SCATTER_URL)
    shared.wait_for_loading(self.driver)

    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type="County",
                             is_new_vis_tools=False)

    # Choose stat vars
    shared.click_sv_group(self.driver, "Demographics")

    # Click on median age
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    # Click on median income
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Income_Persondc/g/Demographics-Median_Income_Person'))

    # Wait for chart to load
    wait_elem(self.driver, by=By.ID, value='scatterplot')

    # Assert title is correct
    chart = find_elem(self.driver,
                      by=By.CSS_SELECTOR,
                      value='#chart .chart-card .chart-title')
    self.assertIn("median income of a population ",
                  find_elem(chart, by=By.XPATH, value='./h3[1]').text.lower())
    self.assertIn("median age of population ",
                  find_elem(chart, by=By.XPATH, value='./h3[2]').text.lower())

    # Assert is a scatter plot with at least 50 circles
    # (CA has 58 counties)
    wait_elem(self.driver, By.TAG_NAME, 'circle')
    circles = find_elems(self.driver,
                         by=By.CSS_SELECTOR,
                         value='#scatterplot circle')
    self.assertGreater(len(circles), 50)

  @pytest.mark.one_at_a_time
  def test_click_map_button_results_in_map_chart(self):
    """Test clicking the map type button will cause a map chart to show up."""
    self.driver.get(self.url_ + STANDARDIZED_SCATTER_URL)
    shared.wait_for_loading(self.driver)

    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type="County",
                             is_new_vis_tools=False)

    # Select map type chart
    shared.click_el(self.driver, (By.ID, 'scatter-chart-type-selector-map'))

    # Choose stat vars
    shared.click_sv_group(self.driver, "Demographics")

    # Click on median age
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    # Click on median income
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Income_Persondc/g/Demographics-Median_Income_Person'))

    # Wait for chart to load
    wait_elem(self.driver, by=By.ID, value='chart')

    # Assert title is correct
    chart_title_container = find_elem(self.driver,
                                      by=By.CSS_SELECTOR,
                                      value='#chart .chart-card .chart-title')
    self.assertIn(
        "median income of a population ",
        find_elem(chart_title_container, by=By.XPATH,
                  value='./h3[1]').text.lower())
    self.assertIn(
        "median age of population ",
        find_elem(chart_title_container, by=By.XPATH,
                  value='./h3[2]').text.lower())

    # Assert chart is a map with at least 50 regions
    # (CA has 58 counties)
    wait_elem(self.driver, By.TAG_NAME, 'path')
    geo_region_container = find_elem(self.driver,
                                     by=By.ID,
                                     value='map-geo-regions')
    geo_regions = find_elems(geo_region_container, by=By.TAG_NAME, value='path')
    self.assertGreater(len(geo_regions), 50)

  @pytest.mark.one_at_a_time
  def test_click_scatter_button_results_in_scatter_chart(self):
    """Test clicking the scatter chart type button will cause a scatter chart
    to show up.
    """
    self.driver.get(self.url_ + STANDARDIZED_SCATTER_URL)
    shared.wait_for_loading(self.driver)

    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type="County",
                             is_new_vis_tools=False)

    # Select the scatter button
    # Because scatter charts are the default setting, choose map type first
    # before finally clicking the scatter plot button
    shared.click_el(self.driver, (By.ID, 'scatter-chart-type-selector-map'))
    shared.click_el(self.driver, (By.ID, 'scatter-chart-type-selector-scatter'))

    # Choose stat vars
    shared.click_sv_group(self.driver, "Demographics")

    # Click on median age
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    # Click on median income
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Income_Persondc/g/Demographics-Median_Income_Person'))

    # Wait for chart to load
    wait_elem(self.driver, by=By.ID, value='chart')

    # Assert title is correct
    chart_title_container = find_elem(self.driver,
                                      by=By.CSS_SELECTOR,
                                      value='#chart .chart-card .chart-title')
    self.assertIn(
        "median income of a population ",
        find_elem(chart_title_container, by=By.XPATH,
                  value='./h3[1]').text.lower())
    self.assertIn(
        "median age of population ",
        find_elem(chart_title_container, by=By.XPATH,
                  value='./h3[2]').text.lower())

    # Assert is a scatter plot with at least 50 circles
    # (CA has 58 counties)
    wait_elem(self.driver, By.TAG_NAME, 'circle')
    circles = find_elems(self.driver,
                         by=By.CSS_SELECTOR,
                         value='#scatterplot circle')
    self.assertGreater(len(circles), 50)
