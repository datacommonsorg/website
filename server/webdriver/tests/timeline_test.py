# Copyright 2023 Google LLC
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

from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.base_utils import find_elem
import server.webdriver.shared as shared
from server.webdriver.shared_tests.timeline_test import \
    StandardizedTimelineTestMixin
from server.webdriver.shared_tests.timeline_test import TimelineTestMixin


class TestTimeline(TimelineTestMixin, StandardizedTimelineTestMixin,
                   BaseDcWebdriverTest):
  """Class to test scatter page. Tests come from TimelineTestMixin."""

  # TODO(nick-next): Move to shared_tests once metadata_modal feature flag is dropped
  def test_per_capita_metadata(self):
    """Test that per capita toggle affects metadata dialog content."""

    TIMELINE_URL = '/tools/visualization#visType=timeline'
    URL_HASH = '&place=country/USA&sv=%7B"dcid"%3A"Amount_EconomicActivity_GrossDomesticProduction_Nominal"%7D'

    self.driver.get(self.url_ + TIMELINE_URL + URL_HASH)

    # Wait for the chart to load
    shared.wait_for_charts_to_render(self.driver,
                                     timeout_seconds=self.TIMEOUT_SEC)

    # Check the sources before toggling per capita
    original_source_text = find_elem(self.driver, By.CLASS_NAME, 'sources').text
    self.assertIn('datacatalog.worldbank.org', original_source_text)
    self.assertIn('About this data', original_source_text)
    self.assertNotIn('census.gov', original_source_text)

    # Click on the button to open the metadata dialog
    sources_div = find_elem(self.driver, value='sources', by=By.CLASS_NAME)
    metadata_link = sources_div.find_element(
        By.XPATH, ".//a[contains(text(), 'About this data')]")
    self.assertIsNotNone(metadata_link, "About this data link not found")
    metadata_link.click()

    # Wait until the dialog is visible and populated with content
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '.dialog-content h3')))

    # Search for "Total population" text in dialog-content h3 elements
    dialog_content = find_elem(self.driver,
                               value='dialog-content',
                               by=By.CLASS_NAME)
    h3_elements = dialog_content.find_elements(By.XPATH, './/h3')

    # "Per capita" is not checked, so we expect "Total population" to not be found
    total_pop_found = any('Total population' in h3.text for h3 in h3_elements)
    self.assertFalse(
        total_pop_found,
        "Total population should not be present before per capita is checked")

    # Close the dialog by clicking the close button
    dialog_actions = find_elem(self.driver,
                               value='dialog-actions',
                               by=By.CLASS_NAME)
    close_button = dialog_actions.find_element(
        By.XPATH, ".//button[contains(text(), 'Close')]")
    close_button.click()

    # Toggle the per capita checkbox
    per_capita_checkbox = self.driver.find_element(
        By.CSS_SELECTOR, '.chart-options .option-inputs .form-check-input')
    per_capita_checkbox.click()

    # Wait for the chart to reload
    shared.wait_for_loading(self.driver)
    shared.wait_for_charts_to_render(self.driver,
                                     timeout_seconds=self.TIMEOUT_SEC)

    # Verify the source text has changed
    updated_source_text = find_elem(self.driver, By.CLASS_NAME, 'sources').text
    self.assertIn('datacatalog.worldbank.org', updated_source_text)
    self.assertIn('census.gov', updated_source_text)
    self.assertIn('About this data', updated_source_text)

    # Open the metadata dialog again
    sources_div = find_elem(self.driver, value='sources', by=By.CLASS_NAME)
    metadata_link = sources_div.find_element(
        By.XPATH, ".//a[contains(text(), 'About this data')]")
    self.assertIsNotNone(metadata_link, "About this data link not found")
    metadata_link.click()

    # Wait until the dialog is visible and populated with content
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.visibility_of_element_located((
            By.XPATH,
            "//div[contains(@class, 'dialog-content')]//h3[contains(text(), 'Total population')]"
        )))

    # Search for "Total population" text in dialog-content h3 elements
    dialog_content = find_elem(self.driver,
                               value='dialog-content',
                               by=By.CLASS_NAME)
    h3_elements = dialog_content.find_elements(By.XPATH, './/h3')

    # "Per capita" is checked, so we expect "Total population" to be found
    total_pop_found = any('Total population' in h3.text for h3 in h3_elements)
    self.assertTrue(
        total_pop_found,
        "Total population should be present after per capita is checked")
