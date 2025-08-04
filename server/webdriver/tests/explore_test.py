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

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared
from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
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

    empty_loading = find_elem(parent=self.driver, value="loading-container")
    self.assertIsNone(
        empty_loading,
        "Follow Up Questions component is not empty despite having no related topics."
    )
    shared.wait_elem(driver=self.driver, value="follow-up-questions-container")

    empty_follow_up = find_elem(parent=self.driver,
                                value="follow-up-questions-container")
    self.assertIsNone(
        empty_follow_up,
        "Follow Up Questions component is not empty despite having no related topics."
    )

  def test_bar_select_different_facet(self):
    """Tests that the facet selector on a bar chart can be used to update the source."""
    search_params = "#q=Age%20distribution%20in%20the%20united%20states"
    self.driver.get(self.url_ + EXPLORE_URL + search_params)

    shared.wait_for_loading(self.driver)

    # Isolate the "Age Distribution" bar chart
    all_chart_blocks = find_elems(self.driver, By.CLASS_NAME, 'block.subtopic')
    chart_block = None
    for block in all_chart_blocks:
      header = find_elem(block, By.TAG_NAME, 'h3')
      if header and header.text == "Age Distribution":
        chart_block = block
        break
    self.assertIsNotNone(chart_block,
                         "Could not find the 'Age Distribution' chart block.")

    original_source_text = find_elem(chart_block, By.CLASS_NAME, 'sources').text
    self.assertEqual(
        original_source_text,
        'Sources: data.census.gov, census.gov, data.census.gov • Show metadata')

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
    self.assertEqual(len(source_options), 14)

    source_options[1].click()

    # Click the modal-footer button to apply the changes
    modal_footer_button = find_elem(
        self.driver,
        value='source-selector-update-source-button',
        path_to_elem=['dialog-actions'])
    modal_footer_button.click()

    # Wait for the chart to reload
    shared.wait_for_loading(self.driver)

    # Verify the source text has changed
    updated_source_text = find_elem(chart_block, By.CLASS_NAME, 'sources').text
    self.assertEqual(updated_source_text,
                     "Source: wonder.cdc.gov • Show metadata")
