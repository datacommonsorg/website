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

from server.webdriver import shared
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems

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
    """Test the highlight chart for France GDP timeline."""
    highlight_params = "#sv=Amount_EconomicActivity_GrossDomesticProduction_Nominal&p=country%2FFRA___country%2FITA&chartType=BAR_CHART"
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    place_callout = find_elem(self.driver, By.ID, 'place-callout')
    self.assertIn('France, Italy', place_callout.text)

    highlight_div = find_elem(self.driver, By.CLASS_NAME,
                              'highlight-result-title')
    line_chart = find_elem(highlight_div, By.CLASS_NAME, 'bar-chart')
    self.assertIsNotNone(line_chart)

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
