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
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared
from server.webdriver.base_utils import find_any_of_elems
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_for_text

EXPLORE_URL = '/explore'


class ExplorePageTestMixin():
  """Mixins to test the explore page."""

  def _assert_places_in_tooltip(self, expected_places: list[str]):
    """Asserts that the expected place names are present as links inside the tooltip"""
    # Find the tooltip within the header
    header_element = find_elem(self.driver, By.ID,
                               'result-header-place-callout')
    tooltip_trigger = find_elem(header_element, By.XPATH,
                                ".//span[contains(text(), 'places')]")
    self.assertIsNotNone(tooltip_trigger, "Tooltip trigger not found in header")

    # Hover over the tooltip to make it visible
    actions = ActionChains(self.driver)
    actions.move_to_element(tooltip_trigger).perform()

    tooltip_element = WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, "div[role='tooltip']")))

    # Find all place links inside the tooltip
    place_links = find_elems(tooltip_element, By.CLASS_NAME,
                             'place-callout-link')

    # Verify that the text we are looking for is found inside the element.
    found_places = [link.text for link in place_links]
    self.assertSetEqual(
        set(found_places), set(expected_places),
        f"Places in tooltip did not match. Found: {found_places}, Expected: {expected_places}"
    )

  @pytest.mark.smoke_test
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
    """Test the highlight chart for France and Italy GDP timeline."""
    highlight_params = "#sv=Amount_EconomicActivity_GrossDomesticProduction_Nominal&p=country%2FFRA___country%2FITA&chartType=TIMELINE_WITH_HIGHLIGHT"
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    # Test for the expected place names in either the new or legacy callout
    locators = [(By.ID, 'place-callout'),
                (By.ID, 'result-header-place-callout')]
    header_element = find_any_of_elems(self.driver, locators)

    if not header_element:
      self.fail(
          "Neither legacy 'place-callout' nor new 'result-header-place-callout' was found."
      )

    header_id = header_element.get_attribute('id')
    if header_id == 'place-callout':
      # Legacy header
      self.assertIn('France, Italy', header_element.text)
    elif header_id == 'result-header-place-callout':
      # New header
      self._assert_places_in_tooltip(['France', 'Italy'])

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

    # Test for the expected place names in either the new or legacy callout
    locators = [(By.ID, 'place-callout'),
                (By.ID, 'result-header-place-callout')]
    header_element = find_any_of_elems(self.driver, locators)

    if not header_element:
      self.fail(
          "Neither legacy 'place-callout' nor new 'result-header-place-callout' was found."
      )

    header_id = header_element.get_attribute('id')
    if header_id == 'place-callout':
      # Legacy header
      self.assertIn('France, Italy', header_element.text)
    elif header_id == 'result-header-place-callout':
      # New header
      self._assert_places_in_tooltip(['France', 'Italy'])

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

    # Test for the expected place names in either the new or legacy callout
    locators = [(By.ID, 'place-callout'),
                (By.ID, 'result-header-place-callout')]
    header_element = find_any_of_elems(self.driver, locators)

    if not header_element:
      self.fail(
          "Neither legacy 'place-callout' nor new 'result-header-place-callout' was found."
      )

    header_id = header_element.get_attribute('id')
    if header_id == 'place-callout':
      # Legacy header
      self.assertIn('France, Italy', header_element.text)
    elif header_id == 'result-header-place-callout':
      # New header
      self._assert_places_in_tooltip(['France', 'Italy'])

    highlight_div = find_elem(self.driver, By.CLASS_NAME,
                              'highlight-result-title')
    line_chart = find_elem(highlight_div, By.CLASS_NAME, 'bar-chart')
    self.assertIsNotNone(line_chart)

    # Click on the topic button
    topic_buttons = find_elem(self.driver, By.CLASS_NAME,
                              'explore-relevant-topics')
    if not topic_buttons:
      self.skipTest(
          "Topic buttons not found, skipping remaining checks (feature flag).")

    topic_button_list = find_elems(self.driver, By.CLASS_NAME, 'item-list-text')
    self.assertGreater(len(topic_button_list), 0,
                       "No topic buttons found in the list")

    topic_button_list[0].click()

    shared.wait_for_loading(self.driver)
    # Check that the highlight chart is cleared
    # TODO (nick-next): Test waits the full timeout before the expected negative result and so is slow to resolve.
    highlight_divs = find_elems(self.driver, By.CLASS_NAME,
                                'highlight-result-title')
    self.assertEqual(len(highlight_divs), 0)
