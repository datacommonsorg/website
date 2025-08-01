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
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_for_text

EXPLORE_URL = '/explore'


class ExplorePageTestMixin():
  """Mixins to test the explore page."""

  def test_explore_page(self):
    """Test the explore page."""
    self.driver.get(self.url_ + EXPLORE_URL)

    shared.wait_for_loading(self.driver)

    # Check that the page title is correct
    title_text = "Explore - " + self.dc_title_string
    self.assertEqual(self.driver.title, title_text)

    place_callout_link = find_elem(self.driver, By.CLASS_NAME,
                                   'place-callout-link')
    self.assertEqual(place_callout_link.text, 'California')

  def test_highlight_chart_france_gdp_timeline(self):
    """Test the highlight chart for France GDP timeline."""
    highlight_params = "#sv=Amount_EconomicActivity_GrossDomesticProduction_Nominal&p=country%2FFRA&chartType=TIMELINE_WITH_HIGHLIGHT"
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    place_callout_link = find_elem(self.driver, By.CLASS_NAME,
                                   'place-callout-link')
    self.assertEqual(place_callout_link.text, 'France')

  def test_highlight_chart_as_url_params(self):
    """Test the highlight chart for France GDP timeline."""
    highlight_params = "?sv=Amount_EconomicActivity_GrossDomesticProduction_Nominal&p=country%2FFRA&chartType=TIMELINE_WITH_HIGHLIGHT"
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    place_callout_link = find_elem(self.driver, By.CLASS_NAME,
                                   'place-callout-link')
    self.assertEqual(place_callout_link.text, 'France')

    highlight_div = find_elem(self.driver, By.CLASS_NAME,
                              'highlight-result-title')
    line_chart = find_elem(highlight_div, By.CLASS_NAME, 'line-chart')
    self.assertIsNotNone(line_chart)

  def test_highlight_chart_france_italy_gdp_timeline(self):
    """Test the highlight chart for France GDP timeline."""
    highlight_params = "#sv=Amount_EconomicActivity_GrossDomesticProduction_Nominal&p=country%2FFRA___country%2FITA&chartType=TIMELINE_WITH_HIGHLIGHT"
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    place_callout = find_elem(self.driver, By.ID, 'place-callout')
    self.assertIn('France, Italy', place_callout.text)

    highlight_div = find_elem(self.driver, By.CLASS_NAME,
                              'highlight-result-title')
    line_chart = find_elem(highlight_div, By.CLASS_NAME, 'line-chart')
    self.assertIsNotNone(line_chart)

  def test_highlight_chart_france_italy_gdp_bar_chart(self):
    """Test the highlight chart for France + Italy nominal GDP bar chart."""
    highlight_params = (
        "#sv=Amount_EconomicActivity_GrossDomesticProduction_Nominal"
        "&p=country%2FFRA___country%2FITA"
        "&chartType=BAR_CHART"
        "&imp=WorldDevelopmentIndicators")
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    place_callout = find_elem(self.driver, By.ID, "place-callout")
    self.assertIn("France, Italy", place_callout.text)

    highlight_div = find_elem(self.driver, By.CLASS_NAME,
                              "highlight-result-title")
    bar_chart = find_elem(highlight_div, By.CLASS_NAME, "bar-chart")
    self.assertIsNotNone(bar_chart)

    expected_citation = (
        "World Bank, World Development Indicators, with minor processing by Data Commons"
    )

    wait_for_text(self.driver, expected_citation, By.CLASS_NAME,
                  "metadata-summary")

  def test_highlight_chart_clears(self):
    """Test the highlight chart for France GDP timeline clears after topic selected."""
    highlight_params = "#sv=Amount_EconomicActivity_GrossDomesticProduction_Nominal&p=country%2FFRA___country%2FITA&chartType=BAR_CHART"
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    place_callout = find_elem(self.driver, By.ID, 'place-callout')
    self.assertIn('France, Italy', place_callout.text)

    highlight_div = find_elem(self.driver, By.CLASS_NAME,
                              'highlight-result-title')
    line_chart = find_elem(highlight_div, By.CLASS_NAME, 'bar-chart')
    self.assertIsNotNone(line_chart)

    # Click on the topic button
    topic_buttons = find_elem(self.driver, By.CLASS_NAME,
                              'explore-relevant-topics')
    self.assertIsNotNone(topic_buttons, "Topic buttons element not found")

    topic_button_list = find_elems(self.driver, By.CLASS_NAME, 'item-list-text')
    self.assertGreater(len(topic_button_list), 0,
                       "No topic buttons found in the list")

    topic_button_list[0].click()

    shared.wait_for_loading(self.driver)
    # Check that the highlight chart is cleared
    highlight_divs = find_elems(self.driver, By.CLASS_NAME,
                                'highlight-result-title')
    self.assertEqual(len(highlight_divs), 0)

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
