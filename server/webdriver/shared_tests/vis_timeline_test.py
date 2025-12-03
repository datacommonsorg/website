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
from server.webdriver.base_utils import LONG_TIMEOUT
from server.webdriver.base_utils import wait_elem
from server.webdriver.base_utils import wait_for_text
import server.webdriver.shared as shared

TIMELINE_URL = '/tools/visualization?disable_feature=standardized_vis_tool#visType=timeline'
URL_HASH_1 = '&place=geoId/06___geoId/08&sv=%7B"dcid"%3A"Median_Age_Person"%7D___%7B"dcid"%3A"Count_Person_Female"%7D___%7B"dcid"%3A"Count_Person_Male"%7D'
URL_HASH_2 = '&place=geoId/06___geoId/08&placeType=County&sv=%7B"dcid"%3A"LifeExpectancy_Person"%7D'
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

    # Wait for page to load
    wait_for_text(self.driver,
                  text="Timeline",
                  by=By.CSS_SELECTOR,
                  value='.info-content h3')

    # Assert page title is correct.
    title_text = "Tools - " + self.dc_title_string
    print(f"[DEBUG] Expected title to contain: '{title_text}'")
    print(f"[DEBUG] Actual title was:          '{self.driver.title}'")
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
    shared.wait_for_charts_to_render(self.driver,
                                     timeout_seconds=self.TIMEOUT_SEC)

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
    self.assertTrue(
        'median age of population' in stat_var_chips[0].text.lower())
    self.assertTrue('female population' in stat_var_chips[1].text.lower())
    self.assertTrue('male population' in stat_var_chips[2].text.lower())

    # Assert charts are correct
    charts = self.driver.find_elements(By.CSS_SELECTOR, '.chart.timeline')
    self.assertEqual(len(charts), 2)
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 4)
    chart_lines = charts[1].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 2)

    # Click per capita and assert results are correct
    per_capita_checkbox = self.driver.find_element(
        By.CSS_SELECTOR, '.chart-options .option-inputs .form-check-input')
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
    update_button = self.driver.find_element(
        By.CLASS_NAME, 'source-selector-update-source-button')
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

  def test_no_facet_choices_available(self):
    """Test that for a stat var with only one source, we show a message
    instead of the source selector modal button.
    """
    self.driver.get(self.url_ + TIMELINE_URL + URL_HASH_2)

    # Wait until the chart has loaded
    shared.wait_for_charts_to_render(self.driver,
                                     timeout_seconds=self.TIMEOUT_SEC)

    # Wait for the chart timeline container element
    chart_timeline = wait_elem(self.driver,
                               by=By.CSS_SELECTOR,
                               value=".chart.timeline")
    self.assertIsNotNone(chart_timeline, "Chart timeline container not found.")

    # Wait for the existence of the message
    expected_text = "One facet available for this chart"
    wait_for_text(self.driver,
                  text=expected_text,
                  by=By.CSS_SELECTOR,
                  value=".chart.timeline header")

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

    shared.search_for_multiple_places(self.driver, ["California", "USA"])

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
    shared.wait_for_charts_to_render(self.driver, timeout_seconds=LONG_TIMEOUT)
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
    wait_elem(self.driver, By.CSS_SELECTOR, 'info-content a')
    self.driver.find_element(By.CSS_SELECTOR, '.info-content a').click()
    shared.wait_for_loading(self.driver)

    # Assert chart loads
    wait_elem(self.driver, By.CSS_SELECTOR, '.chart.timeline')
    charts = self.driver.find_elements(By.CSS_SELECTOR, '.chart.timeline')
    self.assertEqual(len(charts), 1)
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 3)

  def test_select_different_facet(self):
    """Test selecting a different facet of the metadata and verify the line changes."""
    self.driver.get(self.url_ + TIMELINE_URL + URL_HASH_1)

    shared.wait_for_loading(self.driver)

    sources_element = wait_elem(self.driver,
                                by=By.CSS_SELECTOR,
                                value=".chart .sources")
    self.assertIsNotNone(sources_element, "Initial sources element not found.")

    original_source_text = sources_element.text
    self.assertEqual(original_source_text,
                     'Source: census.gov • About this data')

    # Click on the button to open the source selector modal
    find_elem(self.driver, value='source-selector-open-modal-button').click()

    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(lambda d: d.find_elements(
                      By.CSS_SELECTOR, '.source-selector-facet-option-title'))
    source_options = self.driver.find_elements(
        By.CSS_SELECTOR, '.source-selector-facet-option-title')
    self.assertEqual(len(source_options), 18)

    source_options[7].click()

    # Click the modal-footer button to apply the changes
    modal_footer_button = find_elem(
        self.driver,
        value='source-selector-update-source-button',
        path_to_elem=['dialog-actions'])
    modal_footer_button.click()

    # Wait for the chart to reload
    shared.wait_for_loading(self.driver)

    # Verify the source text has changed
    updated_sources_element = wait_elem(self.driver,
                                        by=By.CSS_SELECTOR,
                                        value=".chart .sources")
    self.assertIsNotNone(updated_sources_element,
                         "Updated sources element not found.")

    updated_source_text = updated_sources_element.text
    self.assertEqual(
        updated_source_text,
        'Sources: census.gov, data-explorer.oecd.org • About this data')
