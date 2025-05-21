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

import time

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
import server.webdriver.shared as shared

TIMELINE_URL = '/tools/visualization#visType=timeline'
URL_HASH_1 = '&place=geoId/06___geoId/08&sv=%7B"dcid"%3A"Median_Age_Person"%7D___%7B"dcid"%3A"Count_Person_Female"%7D___%7B"dcid"%3A"Count_Person_Male"%7D'
PLACE_SEARCH_CA = 'California'
PLACE_SEARCH_USA = 'USA'


class VisTimelineTestMixin():
  """Mixins to test the timeline visualization page."""

  def test_server_and_page(self):
    """Test the server can run successfully."""
    self.driver.get(self.url_ + TIMELINE_URL)

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
    self.assertEqual(page_header.text, 'Timeline')
    selected_tab = self.driver.find_element(
        By.CSS_SELECTOR, ".vis-type-selector .selected .label")
    self.assertEqual(selected_tab.text, 'Timeline')

  @pytest.mark.skip(reason="fix this test later")
  def test_charts_from_url(self):
    """Given the url directly, test the page shows up correctly"""
    self.driver.get(self.url_ + TIMELINE_URL + URL_HASH_1)

    # Wait until the chart has loaded
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(shared.charts_rendered)

    # Assert place name is correct
    place_name_chips = self.driver.find_elements(
        By.CSS_SELECTOR, '.selected-option-chip.place .chip-content')
    self.assertEqual(len(place_name_chips), 2)
    self.assertTrue('California' in place_name_chips[0].text)
    self.assertTrue('Colorado' in place_name_chips[1].text)

    # Assert stat var is correct
    stat_var_chips = self.driver.find_elements(
        By.CSS_SELECTOR, '.selected-option-chip.stat-var .chip-content')
    self.assertEqual(len(stat_var_chips), 3)
    self.assertTrue('Median Age of Population' in stat_var_chips[0].text)
    self.assertTrue('Female Population' in stat_var_chips[1].text)
    self.assertTrue('Male Population' in stat_var_chips[2].text)

    # Assert charts are correct
    charts = self.driver.find_elements(By.CSS_SELECTOR, '.chart.timeline')
    self.assertEqual(len(charts), 2)
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 4)
    chart_lines = charts[1].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 2)

    # Click per capita and assert results are correct
    per_capita_checkbox = self.driver.find_element(
        By.CSS_SELECTOR,
        '.chart-footer-options .chart-option .form-check-input')
    per_capita_checkbox.click()
    shared.wait_for_loading(self.driver)
    element_present = EC.presence_of_element_located(
        (By.CSS_SELECTOR, '.chart.timeline'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    charts = self.driver.find_elements(By.CSS_SELECTOR, '.chart.timeline')
    self.assertEqual(len(charts), 2)
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 4)

    # Edit source and assert results are correct
    edit_source_button = self.driver.find_element(
        By.CLASS_NAME, 'source-selector-open-modal-button')
    edit_source_button.click()
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'modal-body'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    source_option_sections = self.driver.find_elements(
        By.CLASS_NAME, 'source-selector-options-section')
    self.assertEqual(len(source_option_sections), 2)
    # Open the selection section for each sv
    self.driver.find_elements(By.CLASS_NAME,
                              'source-selector-trigger')[0].click()
    self.driver.find_elements(By.CLASS_NAME,
                              'source-selector-trigger')[1].click()
    # Update the source for the Count_Person_Female sv
    element_present = EC.element_to_be_clickable(
        (By.NAME, 'Count_Person_Female'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    shared.select_source(self.driver, "OECDRegionalStatistics",
                         'Count_Person_Female')
    update_button = self.driver.find_element(By.CSS_SELECTOR,
                                             '.modal-footer .btn')
    update_button.click()
    shared.wait_for_loading(self.driver)
    chart_sources = self.driver.find_element(By.CLASS_NAME, 'sources')
    self.assertTrue('stats.oecd.org' in chart_sources.text)
    charts = self.driver.find_elements(By.CSS_SELECTOR, '.chart.timeline')
    self.assertEqual(len(charts), 2)
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 4)
    chart_lines = charts[1].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 2)

  def test_manually_enter_options(self):
    """Test entering place and stat var options manually will cause chart to
    show up.
    """
    self.driver.get(self.url_ + TIMELINE_URL.replace('#visType=timeline', ''))

    # Click the timeline tab
    timeline_tab_xpath = "//*[contains(@class, 'vis-type-option') and .//*[contains(text(), 'Timeline')]]"
    shared.click_el(self.driver, (By.XPATH, timeline_tab_xpath))
    page_header_locator = (By.CSS_SELECTOR, '.info-content h3')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.text_to_be_present_in_element(page_header_locator, 'Timeline'))

    # Click the start button
    shared.click_el(self.driver, (By.CLASS_NAME, 'start-button'))

    # Type california into the search box.
    element_present = EC.presence_of_element_located((By.ID, 'location-field'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    search_box_input = self.driver.find_element(By.ID, 'ac')
    search_box_input.send_keys(PLACE_SEARCH_CA)

    # Click on the first result.
    first_result_locator = (By.XPATH, '(//*[contains(@class, "pac-item")])[1]')
    shared.click_el(self.driver, first_result_locator)

    # Type USA into the search box after California has been selected.
    element_present = EC.presence_of_element_located(
        (By.CSS_SELECTOR, '.place-selector-selections .selected-place'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    search_box_input = self.driver.find_element(By.ID, 'ac')
    search_box_input.send_keys(PLACE_SEARCH_USA)

    # Click on the first result.
    shared.click_el(self.driver, first_result_locator)

    # Click continue after USA has been selected.
    element_present = EC.text_to_be_present_in_element(
        (By.CLASS_NAME, 'place-selector-selections'),
        'United States of America')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    shared.click_el(self.driver, (By.CLASS_NAME, 'continue-button'))

    # Choose stat vars
    shared.wait_for_loading(self.driver)
    shared.click_sv_group(self.driver, "Demographics")
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Income_Persondc/g/Demographics-Median_Income_Person'))

    # Click continue after selection is done loading.
    shared.wait_for_loading(self.driver)
    shared.click_el(self.driver, (By.CLASS_NAME, 'continue-button'))

    # Assert chart is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(shared.charts_rendered)
    charts = self.driver.find_elements(By.CSS_SELECTOR, '.chart.timeline')
    self.assertEqual(len(charts), 2)
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 2)
    chart_lines = charts[1].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 2)

  def test_landing_page_link(self):
    """Test one of the links on the landing page
    """
    self.driver.get(self.url_ + TIMELINE_URL)

    # Click a link on the landing page
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'info-content'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(By.CSS_SELECTOR, '.info-content a').click()

    # Assert chart loads
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(shared.charts_rendered)
    charts = self.driver.find_elements(By.CSS_SELECTOR, '.chart.timeline')
    self.assertEqual(len(charts), 1)
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 3)

  def test_select_different_facet(self):
    """Test selecting a different facet of the metadata and verify the line changes."""
    self.driver.get(self.url_ + TIMELINE_URL + URL_HASH_1)

    shared.wait_for_loading(self.driver)

    original_source_text = find_elems(self.driver,
                                      value='sources',
                                      path_to_elem=['chart'])[0].text
    self.assertEqual(original_source_text, 'Source: census.gov • Show metadata')

    # Click on the button to open the source selector modal
    find_elem(self.driver, value='source-selector-open-modal-button').click()

    shared.wait_for_loading(self.driver)

    first_sv = find_elem(self.driver, value='source-selector-trigger').click()

    shared.wait_for_loading(self.driver)

    source_options = find_elems(
        self.driver,
        value='source-selector-option-title',
        path_to_elem=['source-selector-options-section'])
    self.assertEqual(len(source_options), 18)

    radio = find_elem(source_options[8], by=By.TAG_NAME, value='input')
    radio.click()

    # Click the modal-footer button to apply the changes
    modal_footer_button = find_elem(self.driver,
                                    value='btn-primary',
                                    path_to_elem=['modal-footer'])
    modal_footer_button.click()

    # Wait for the chart to reload
    shared.wait_for_loading(self.driver)

    # Verify the source text has changed
    updated_source_text = find_elem(self.driver,
                                    value='sources',
                                    path_to_elem=['chart']).text
    self.assertEqual(
        updated_source_text,
        'Sources: census.gov, data-explorer.oecd.org • Show metadata')
