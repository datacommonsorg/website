# Copyright 2025 Google LLC
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
import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared
from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_for_text
from server.webdriver.shared_tests.explore_test import EXPLORE_URL
from server.webdriver.shared_tests.explore_test import ExplorePageTestMixin


class TestExplorePage(ExplorePageTestMixin, BaseDcWebdriverTest):
  """Class to test explore page. Tests come from ExplorePageTestMixin."""

  def test_follow_up_questions_typical(self):
    """Test that the Follow Up Questions are generated and displayed when queries have related topics."""
    follow_up_flag = "?enable_feature=follow_up_questions_ga"
    query = "#q=What is the population of Mountain View?"

    self.driver.get(self.url_ + EXPLORE_URL + follow_up_flag + query)
    shared.wait_elem(driver=self.driver, value="follow-up-questions-container")

    follow_up_questions = find_elems(self.driver, By.CLASS_NAME,
                                     'follow-up-questions-list-text')
    self.assertGreater(len(follow_up_questions), 0,
                       "No follow up questions found in the list.")

  def test_follow_up_questions_no_related_topics(self):
    """Test that the Follow Up Questions component does not exist for queries that have no related topics."""
    follow_up_flag = "?enable_feature=follow_up_questions_ga"
    # The query below has no related topics identified.
    query = "#q=Which countries have the highest college-educated population in the world?"

    self.driver.get(self.url_ + EXPLORE_URL + follow_up_flag + query)
    shared.wait_for_loading(self.driver)

    # Use find_elements directly to avoid waiting for the element to appear (since we expect it to be missing)
    empty_loading = self.driver.find_elements(By.CLASS_NAME,
                                              "loading-container")
    self.assertEqual(
        len(empty_loading), 0,
        "Follow Up Questions component is not empty despite having no related topics."
    )

    # Use find_elements directly to avoid waiting for the element to appear (since we expect it to be missing)
    empty_follow_up = self.driver.find_elements(
        By.CLASS_NAME, "follow-up-questions-container")
    self.assertEqual(
        len(empty_follow_up), 0,
        "Follow Up Questions component is not empty despite having no related topics."
    )

  def test_page_overview_typical(self):
    """Test that a Page Overview is generated and displayed."""
    page_overview_flag = "?enable_feature=page_overview_ga"
    query = "#q=What is the population of Mountain View?"

    self.driver.get(self.url_ + EXPLORE_URL + page_overview_flag + query)

    self.assertIsNotNone(
        shared.wait_elem(driver=self.driver,
                         by=By.CSS_SELECTOR,
                         value='[data-testid="page-overview-inner"]'),
        "No page overview was generated.")

  def test_bar_select_different_facet(self):
    """Tests that the facet selector on a bar chart can be used to update the source."""
    search_params = "#q=Jobs%20in%20the%20united%20states"
    self.driver.get(self.url_ + EXPLORE_URL + search_params)

    shared.wait_for_loading(self.driver)

    def categories_of_jobs_block_present(driver):
      """Look for the Categories of Jobs block"""
      all_chart_blocks = find_elems(driver, By.CLASS_NAME, 'block.subtopic')
      chart_block = None
      for block in all_chart_blocks:
        header = find_elem(block, By.TAG_NAME, 'h3')
        if header and header.text == "Categories of Jobs":
          chart_block = block
          break
      return chart_block or False

    # Wait for 'Categories of Jobs' block to be present
    chart_block = WebDriverWait(
        self.driver, self.TIMEOUT_SEC).until(categories_of_jobs_block_present)

    # Check metadata before choosing a facet
    sources_div_before = find_elem(chart_block,
                                   value='sources',
                                   by=By.CLASS_NAME)
    metadata_link_before = sources_div_before.find_element(
        By.XPATH, ".//a[contains(text(), 'About this data')]")
    metadata_link_before.click()

    # Wait for the dialog to be visible
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '.dialog-content h4')))

    dialog_content_before = find_elem(self.driver,
                                      value='dialog-content',
                                      by=By.CLASS_NAME)
    # Find the "Observation period" header and check value underneath
    obs_period_header_before = dialog_content_before.find_element(
        By.XPATH, ".//h4[contains(text(), 'Observation period')]")
    obs_period_value_before = obs_period_header_before.find_element(
        By.XPATH, "following-sibling::p[1]")
    self.assertIn(
        "Monthly (P1M)", obs_period_value_before.text,
        "Observation period should be 'Monthly (P1M)' before facet change.")

    # Close the dialog
    close_button = find_elem(self.driver, By.XPATH,
                             "//button[contains(text(), 'Close')]")
    close_button.click()
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.invisibility_of_element_located(
            (By.CSS_SELECTOR, '.dialog-content')))

    # Click on the button to open the facet selector modal
    facet_button = find_elem(chart_block, By.CLASS_NAME,
                             'source-selector-open-modal-button')
    self.assertIsNotNone(facet_button, "Facet selector button not found")
    facet_button.click()

    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(lambda d: d.find_elements(
                      By.CSS_SELECTOR, '.source-selector-facet-option-title'))
    source_options = self.driver.find_elements(
        By.CSS_SELECTOR, '.source-selector-facet-option-title')
    self.assertEqual(len(source_options), 3)
    source_options[1].click()

    modal_footer_button = find_elem(
        self.driver,
        value='source-selector-update-source-button',
        path_to_elem=['dialog-actions'])
    modal_footer_button.click()

    # Wait for the chart to reload after the change
    shared.wait_for_loading(self.driver)

    sources_div_after = find_elem(chart_block,
                                  value='sources',
                                  by=By.CLASS_NAME)
    metadata_link_after = sources_div_after.find_element(
        By.XPATH, ".//a[contains(text(), 'About this data')]")
    metadata_link_after.click()

    # Wait for the dialog to be visible again
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.visibility_of_element_located((
            By.XPATH,
            "//h4[contains(text(), 'Observation period')]/following-sibling::p[contains(text(), 'Yearly (P1Y)')]"
        )))

    dialog_content_after = find_elem(self.driver,
                                     value='dialog-content',
                                     by=By.CLASS_NAME)
    # Find the "Observation period" header and verify value has changed
    obs_period_header_after = dialog_content_after.find_element(
        By.XPATH, ".//h4[contains(text(), 'Observation period')]")
    obs_period_value_after = obs_period_header_after.find_element(
        By.XPATH, "following-sibling::p[1]")
    self.assertIn(
        "Yearly (P1Y)", obs_period_value_after.text,
        "Observation period should be 'Yearly (P1Y)' after facet change.")

  def test_map_select_different_facet(self):
    """Tests that the facet selector on a map chart can be used to update the source."""
    search_params = "#q=age+distribution+in+the+USA+by+state"
    self.driver.get(self.url_ + EXPLORE_URL + search_params)

    shared.wait_for_loading(self.driver)

    # Isolate the "Population: 1-4 Years" map chart
    all_chart_blocks = find_elems(self.driver, By.CLASS_NAME, 'block.subtopic')
    chart_block = None
    for block in all_chart_blocks:
      header = find_elem(block, By.TAG_NAME, 'h3')
      if header and header.text == "Population: 1-4 Years in States of United States":
        chart_block = block
        break
    self.assertIsNotNone(
        chart_block,
        "Could not find the 'Population: 1-4 Years in States of United States' map block."
    )

    original_source_text = find_elem(chart_block, By.CLASS_NAME, 'sources').text
    self.assertEqual(
        original_source_text,
        'Sources: data.census.gov, data.census.gov • About this data')

    # Click on the button to open the facet selector modal
    facet_button = find_elem(chart_block, By.CLASS_NAME,
                             'source-selector-open-modal-button')
    self.assertIsNotNone(facet_button, "Facet selector button not found")
    facet_button.click()

    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(lambda d: d.find_elements(
                      By.CSS_SELECTOR, '.source-selector-facet-option-title'))
    source_options = self.driver.find_elements(
        By.CSS_SELECTOR, '.source-selector-facet-option-title')
    self.assertEqual(len(source_options), 4)

    # Select the second source option
    source_options[1].click()

    # Click the modal-footer button to apply the changes
    modal_footer_button = find_elem(
        self.driver,
        value='source-selector-update-source-button',
        path_to_elem=['dialog-actions'])
    modal_footer_button.click()

    # Wait for the source text to update.
    expected_source_text = "Source: wonder.cdc.gov • About this data"
    wait_for_text(driver=chart_block,
                  text=expected_source_text,
                  by=By.CLASS_NAME,
                  value='sources')

    # Verify the source text has changed
    updated_source_text = find_elem(chart_block, By.CLASS_NAME, 'sources').text
    self.assertEqual(updated_source_text, expected_source_text)

  def test_map_toggle_highest_coverage(self):
    """Tests that the 'highest coverage' toggle on a map chart can be used to update the date."""
    search_params = "#q=population+in+world+countries"
    self.driver.get(self.url_ + EXPLORE_URL + search_params)

    shared.wait_for_loading(self.driver)

    # Isolate the "Population in the World" map chart
    all_chart_blocks = find_elems(self.driver, By.CLASS_NAME, 'block.subtopic')
    chart_block = None
    for block in all_chart_blocks:
      header = find_elem(block, By.TAG_NAME, 'h3')
      if header and header.text == "Population in the World":
        chart_block = block
        break
    self.assertIsNotNone(
        chart_block, "Could not find the 'Population in the World' map block.")

    static_header_text = "Population in the World"
    wait_for_text(chart_block, static_header_text, By.TAG_NAME, 'h4')
    initial_header = find_elem(chart_block, By.TAG_NAME, 'h4')

    if not initial_header:
      self.fail("The chart's inner header (h4) did not appear.")

    # Regex to pull the last parenthesis from the header (the date or date range)
    regex = r'\([^()]*\)\s*$'

    initial_date_match = re.search(regex, initial_header.text)
    self.assertIsNotNone(initial_date_match,
                         "Could not find date part in initial header.")
    initial_date_part = initial_date_match.group(0)
    self.assertNotIn(
        "to", initial_date_part,
        f"Initial date '{initial_date_part}' should be a single date, but contains 'to'."
    )

    # Find the toggle.
    toggle_label = find_elem(
        chart_block, By.XPATH,
        ".//label[normalize-space()='Snap to date with highest coverage']")

    # Verify that the toggle is not disabled.
    toggle_input = find_elem(toggle_label, By.TAG_NAME, 'input')
    self.assertIsNotNone(
        toggle_input,
        "Could not find the toggle's input element inside the label.")

    # If the toggle is disabled, the chart has become one the highest coverage data is
    # also the latest data, in which case we cannot toggle. In this case we consider the
    # test to have passed so future data ingestion does not break it.
    if not toggle_input.is_enabled():
      self.fail("Toggle is disabled because latest date has highest coverage. "
                "Test needs to be updated to account for data ingestion.")

    # Click the toggle
    toggle_label.click()

    # Wait for the chart to reload
    shared.wait_for_loading(self.driver)

    # Verify that the date in the chart's inner title has changed
    wait_for_text(chart_block, static_header_text, By.TAG_NAME, 'h4')
    updated_header = find_elem(chart_block, By.TAG_NAME, 'h4')

    if not updated_header:
      self.fail(
          "The chart's inner header (h4) did not reappear after toggling.")
    updated_date_match = re.search(regex, updated_header.text)
    self.assertIsNotNone(updated_date_match,
                         "Could not find date part in updated header.")
    updated_date_part = updated_date_match.group(0)
    self.assertIn(
        "to", updated_date_part,
        f"Updated date '{updated_date_part}' should be a date range, but does not contain 'to'."
    )

  def test_api_code_dialog(self):
    """Tests that the API code dialog opens and contains expected text."""
    search_params = "#q=demographics+in+the+united+states"
    self.driver.get(self.url_ + EXPLORE_URL + search_params)

    shared.wait_for_loading(self.driver)

    # Isolate the "Population" chart block
    all_chart_blocks = find_elems(self.driver, By.CLASS_NAME, 'block.subtopic')
    chart_block = None
    for block in all_chart_blocks:
      header = find_elem(block, By.TAG_NAME, 'h3')
      if header and header.text == "Population":
        chart_block = block
        break
    self.assertIsNotNone(chart_block,
                         "Could not find the 'Population' chart block.")

    # Find and click the API link inside the chart's footer
    api_link = find_elem(chart_block, By.CSS_SELECTOR, '.api-outlink a')
    self.assertIsNotNone(api_link, "Could not find the API link.")
    api_link.click()

    # Wait until the dialog's Python endpoint has appeared
    wait_for_text(self.driver,
                  text="import",
                  by=By.CSS_SELECTOR,
                  value='pre[class*="language-python"]')

    python_code_block = find_elem(self.driver,
                                  by=By.CSS_SELECTOR,
                                  value='pre[class*="language-python"]')
    self.assertIsNotNone(python_code_block,
                         "API dialog's Python code block did not appear.")

    # Get the API cURL endpoint from the code area
    python_actual_text = python_code_block.text
    self.assertIn("Count_Person", python_actual_text)
    self.assertIn("country/USA", python_actual_text)

    # Find the language selector in order to change to Python
    language_selector = find_elem(self.driver,
                                  by=By.ID,
                                  value='api-language-selector')
    self.assertIsNotNone(language_selector,
                         "API dialog's language selector not found.")

    select = Select(language_selector)
    select.select_by_value('curl')

    # Wait for the dialog's cURL endpoint has appeared
    wait_for_text(self.driver,
                  text="curl",
                  by=By.CSS_SELECTOR,
                  value='pre[class*="language-bash"]')

    curl_code_block = find_elem(self.driver,
                                by=By.CSS_SELECTOR,
                                value='pre[class*="language-bash"]')
    self.assertIsNotNone(curl_code_block,
                         "API dialog's cURL code block did not appear.")

    # Get the API cURL endpoint from the code area
    curl_actual_text = curl_code_block.text

    # Verify that key parts of the API call are present
    self.assertIn('"variable": {"dcids": ["Count_Person"]},', curl_actual_text)
    self.assertIn('"entity": {"dcids": ["country/USA"]}', curl_actual_text)

  def test_highlight_chart_facet_selector(self):
    """Test the highlight chart for Population ranking with map of US States."""
    highlight_params = "?sv=Count_BlizzardEvent&p=country/USA&imp=StormNOAA_Agg&chartType=RANKING_WITH_MAP&obsPer=P1Y"
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    highlight_div = find_elem(self.driver, By.CLASS_NAME,
                              'highlight-result-title')
    block_controls = find_elem(highlight_div, By.CLASS_NAME, 'block-controls')
    time.sleep(5)  # Wait for the controls to be fully interactive.
    facet_button = find_elem(block_controls, By.CLASS_NAME,
                             'source-selector-open-modal-button')
    self.assertIsNotNone(facet_button, "Facet selector button not found")
    facet_button.click()

    facet_options = find_elem(self.driver, By.CLASS_NAME,
                              'source-selector-facet-options-section')

    # Verify that the expected option is selected, in this case it has P1Y ObsPeriod.
    for option in find_elems(facet_options, By.TAG_NAME, 'label'):
      is_option_selected = find_elem(option, By.TAG_NAME, 'input').is_selected()
      if is_option_selected:
        list_items = find_elems(option, By.TAG_NAME, 'ul')
        self.assertIn('Observation period • Yearly (P1Y)',
                      str([item.text for item in list_items]))
        break
