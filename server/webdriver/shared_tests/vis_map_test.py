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

import server.webdriver.shared as shared

MAP_URL = '/tools/visualization#visType=map'
URL_HASH_1 = '&place=geoId/06&placeType=County&sv=%7B"dcid"%3A"Count_Person_Female"%7D'


class VisMapTestMixin():
  """Mixins to test the map visualization page."""

  def get_ranking_items(self):
    # The highest and lowest place rankings are loaded separately, so we need to wait for both
    highest_elements = EC.presence_of_all_elements_located(
        (By.CSS_SELECTOR,
         '.highest-ranking-container .ranking-list .place-name'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(highest_elements)

    lowest_elements = EC.presence_of_all_elements_located(
        (By.CSS_SELECTOR,
         '.lowest-ranking-container .ranking-list .place-name'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(lowest_elements)

    ranking_items = self.driver.find_elements(By.CSS_SELECTOR,
                                              '.ranking-list .place-name')
    names_loaded = []
    # Wait for the place names to load by checking if the comma is present
    for i, _ in enumerate(ranking_items):
      names_loaded.append(
          EC.text_to_be_present_in_element((
              By.XPATH,
              f'(//*[contains(@class, "ranking-list")]//*[contains(@class,"place-name")])[{i+1}]'
          ), ','))

    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(EC.all_of(*names_loaded))
    ranking_items = self.driver.find_elements(By.CSS_SELECTOR,
                                              '.ranking-list .place-name')
    return ranking_items

  def get_chart_map_regions(self):
    # Wait for map to load
    element_present = EC.presence_of_element_located((By.ID, 'map-items'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    # Return all <path> elements in the map SVG
    return self.driver.find_elements(
        By.XPATH, '//*[@id="map-items"]//*[local-name()="path"]')

  def test_server_and_page(self):
    """Test the server can run successfully."""
    self.driver.get(self.url_ + MAP_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/visualization.js'), 200)

    # Assert page title is correct.
    title_text = "Tools - " + self.dc_title_string
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

    # Wait until the page has loaded.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'visualization-app'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Assert page heading and selected tab are correct.
    page_header = self.driver.find_element(By.CSS_SELECTOR, '.info-content h3')
    self.assertEqual(page_header.text, 'Map Explorer')
    selected_tab = self.driver.find_element(
        By.CSS_SELECTOR, ".vis-type-selector .selected .label")
    self.assertEqual(selected_tab.text, 'Map Explorer')

  def test_charts_from_url(self):
    """Given the url directly, test the page shows up correctly"""
    self.driver.get(self.url_ + MAP_URL + URL_HASH_1)

    # Wait until the chart has loaded.
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(shared.charts_rendered)

    # Assert place name is correct.
    place_name_chip = self.driver.find_element(
        By.CSS_SELECTOR, '.selected-option-chip.place .chip-content')
    self.assertTrue('California' in place_name_chip.text)

    # Assert place type is correct.
    place_type_chip = self.driver.find_element(
        By.CSS_SELECTOR, '.selected-option-chip.place-type .chip-content')
    self.assertTrue('County' in place_type_chip.text)

    # Assert stat var is correct.
    stat_var_chip = self.driver.find_element(
        By.CSS_SELECTOR, '.selected-option-chip.stat-var .chip-content')
    self.assertTrue('Female Population' in stat_var_chip.text)

    # Assert chart is correct.
    chart_title = self.driver.find_element(By.CSS_SELECTOR,
                                           '.map-chart .chart-headers h4')
    self.assertIn("Female Population ", chart_title.text)
    self.assertEqual(len(self.get_chart_map_regions()), 58)

    # Assert rankings are correct.
    elements_present = EC.presence_of_all_elements_located(
        (By.CSS_SELECTOR, '.ranking-header-section h4'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(elements_present)
    ranking_titles = self.driver.find_elements(By.CSS_SELECTOR,
                                               '.ranking-header-section h4')
    self.assertEqual(len(ranking_titles), 2)
    self.assertEqual(ranking_titles[0].text, 'Top Places')
    self.assertEqual(ranking_titles[1].text, 'Bottom Places')
    ranking_items = self.get_ranking_items()
    self.assertEqual(len(ranking_items), 10)
    self.assertIn(' County, CA', ranking_items[0].text)
    self.assertIn(' County, CA', ranking_items[9].text)

    # Click per capita and assert results are correct.
    per_capita_checkbox = self.driver.find_element(
        By.CSS_SELECTOR,
        '.chart-footer-options .chart-option .form-check-input')
    per_capita_checkbox.click()
    shared.wait_for_loading(self.driver)
    self.assertEqual(len(self.get_chart_map_regions()), 58)
    ranking_items = self.get_ranking_items()
    self.assertEqual(len(ranking_items), 10)
    self.assertIn(' County, CA', ranking_items[0].text)
    self.assertIn(' County, CA', ranking_items[9].text)

    # Edit source and assert results are correct.
    edit_source_button = self.driver.find_element(
        By.CLASS_NAME, 'source-selector-open-modal-button')
    edit_source_button.click()
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'modal-body'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    shared.select_source(self.driver, "CDC_Mortality_UnderlyingCause",
                         "Count_Person_Female")
    update_button = self.driver.find_element(By.CSS_SELECTOR,
                                             '.modal-footer .btn')
    update_button.click()
    shared.wait_for_loading(self.driver)
    chart_title = self.driver.find_element(By.CSS_SELECTOR,
                                           '.map-chart .chart-headers h4')
    self.assertIn("Female Population ", chart_title.text)
    chart_source = self.driver.find_element(
        By.CSS_SELECTOR, '.map-chart .chart-headers .sources')
    self.assertTrue("wonder.cdc.gov" in chart_source.text)
    self.assertEqual(len(self.get_chart_map_regions()), 58)
    ranking_items = self.get_ranking_items()
    self.assertEqual(len(ranking_items), 10)
    self.assertIn(' County, CA', ranking_items[0].text)
    self.assertIn(' County, CA', ranking_items[9].text)

  def test_manually_enter_options(self):
    """Test entering place and stat var options manually will cause chart to
    show up.
    """
    self.driver.get(self.url_ + MAP_URL)

    shared.search_for_california_counties_vis(self, self.driver)

    # Choose stat var
    shared.click_sv_group(self.driver, "Demographics")
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    # Click continue
    shared.click_el(self.driver, (By.CLASS_NAME, 'continue-button'))

    # Assert chart is correct.
    shared.wait_for_loading(self.driver)
    chart_title = self.driver.find_element(By.CSS_SELECTOR,
                                           '.map-chart .chart-headers h4')
    self.assertIn("Median Age of Population ", chart_title.text)
    self.assertEqual(len(self.get_chart_map_regions()), 58)

    # Assert rankings are correct.
    elements_present = EC.presence_of_all_elements_located(
        (By.CSS_SELECTOR, '.ranking-header-section h4'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(elements_present)
    ranking_titles = self.driver.find_elements(By.CSS_SELECTOR,
                                               '.ranking-header-section h4')
    self.assertEqual(len(ranking_titles), 2)
    self.assertEqual(ranking_titles[0].text, 'Top Places')
    self.assertEqual(ranking_titles[1].text, 'Bottom Places')
    ranking_items = self.get_ranking_items()
    self.assertEqual(len(ranking_items), 10)
    self.assertEqual(ranking_items[0].text, 'Sierra County, CA')
    self.assertEqual(ranking_items[9].text, 'Kern County, CA')

  def test_landing_page_link(self):
    """Test one of the links on the landing page
    """
    self.driver.get(self.url_ + MAP_URL)

    # Click a link on the landing page
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'info-content'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(By.CSS_SELECTOR, '.info-content a').click()

    # Assert chart loads
    shared.wait_for_loading(self.driver)
    element_present = EC.presence_of_element_located((By.ID, 'map-items'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    chart_map = self.driver.find_element(By.ID, 'map-items')
    map_regions = chart_map.find_elements(By.TAG_NAME, 'path')
    self.assertGreater(len(map_regions), 1)
