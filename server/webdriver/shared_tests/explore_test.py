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
from server.webdriver.base_utils import scroll_to_elem
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

  def test_highlight_chart_us_states_pop_ranking_with_map(self):
    """Test the highlight chart for Population ranking with map of US States."""
    highlight_params = "#sv=Count_Person&p=country/USA&imp=USCensusPEP_Annual_Population&mm=CensusPEPSurvey&obsPer=P1Y&chartType=RANKING_WITH_MAP"
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    # Test for the expected place names in either the new or legacy callout
    locators = [(By.ID, 'place-callout'),
                (By.ID, 'result-header-place-callout')]
    header_element = find_any_of_elems(self.driver, locators)
    header_id = header_element.get_attribute('id')
    if header_id == 'place-callout':
      # Legacy header
      self.assertIn('United States', header_element.text)
    elif header_id == 'result-header-place-callout':
      wait_for_text(header_element, 'United States', By.TAG_NAME, 'p')

    if not header_element:
      self.fail(
          "Neither legacy 'place-callout' nor new 'result-header-place-callout' was found."
      )

    self.assertIn('United States', header_element.text)

    highlight_div = find_elem(self.driver, By.CLASS_NAME,
                              'highlight-result-title')
    map_tile = find_elem(highlight_div, By.CLASS_NAME, 'map-chart')
    self.assertIsNotNone(map_tile)

    ranking_tile = find_elem(highlight_div, By.CLASS_NAME, 'ranking-tile')
    self.assertIsNotNone(ranking_tile)

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

  def test_highlight_chart_date_selection(self):
    """Test the highlight chart for Population ranking with map of US States."""
    highlight_params = "?sv=Count_DenseFogEvent&p=country/USA&chartType=RANKING_WITH_MAP&obsPer=P1Y&date=2023"
    self.driver.get(self.url_ + EXPLORE_URL + highlight_params)

    shared.wait_for_loading(self.driver)

    highlight_div = find_elem(self.driver, By.CLASS_NAME,
                              'highlight-result-title')
    ranking_tile = find_elem(highlight_div, By.CLASS_NAME, 'ranking-tile')
    self.assertIsNotNone(ranking_tile)
    ranking_date_cells = find_elems(ranking_tile, By.CLASS_NAME,
                                    'ranking-date-cell')
    for cell in ranking_date_cells:
      self.assertIn('2023', cell.text)

  def test_ranking_scroll_enabled(self):
    """Test ranking tile on explore page with scroll feature enabled."""
    self.driver.get(
        self.url_ +
        '/explore?enable_feature=enable_ranking_tile_scroll#sv=Amount_EconomicActivity_GrossDomesticProduction_Nominal&p=Earth&pt=Country&ept=Country&chartType=RANKING_WITH_MAP'
    )

    shared.wait_for_loading(self.driver)

    first_block = find_elems(self.driver, By.CLASS_NAME, 'block')[0]
    ranking_tile = find_elem(first_block, By.CLASS_NAME, 'ranking-tile')
    self.assertIsNotNone(ranking_tile)

    table = find_elem(ranking_tile, by=By.TAG_NAME, value='table')
    self.assertGreater(len(find_elems(table, by=By.XPATH, value='.//tbody/tr')),
                       5)

    # Check for scrollability
    ranking_list = find_elem(ranking_tile,
                             by=By.CLASS_NAME,
                             value='ranking-list')
    ranking_list = find_elem(ranking_tile, By.CLASS_NAME,
                             'ranking-scroll-container')
    self.assertEqual(ranking_list.value_of_css_property('overflow-y'), 'auto')

  def test_ranking_scroll_disabled(self):
    """Test ranking tile on explore page with scroll feature disabled."""
    self.driver.get(
        self.url_ +
        '/explore?disable_feature=enable_ranking_tile_scroll#sv=Amount_EconomicActivity_GrossDomesticProduction_Nominal&p=Earth&pt=Country&ept=Country&chartType=RANKING_WITH_MAP'
    )

    shared.wait_for_loading(self.driver)

    first_block = find_elems(self.driver, By.CLASS_NAME, 'block')[0]
    ranking_tile = find_elem(first_block, By.CLASS_NAME, 'ranking-tile')
    self.assertIsNotNone(ranking_tile)

    table = find_elem(ranking_tile, by=By.TAG_NAME, value='table')
    self.assertLessEqual(
        len(find_elems(table, by=By.XPATH, value='.//tbody/tr')), 11)

    # Check for non-scrollability
    ranking_list = find_elem(ranking_tile,
                             by=By.CLASS_NAME,
                             value='ranking-list')
    # There should be no div with overflow-y: auto
    scrollable_divs = find_elems(
        ranking_list,
        by=By.XPATH,
        value="./div[@style='max-height: 400px; overflow-y: auto;']")
    self.assertEqual(len(scrollable_divs), 0)

  def _assert_url_params(self, url, expected_params):
    for key, value in expected_params.items():
      if value is None:
        self.assertNotIn(f"{key}=", url)
      else:
        self.assertIn(f"{key}={value}", url)

  def test_ranking_chart_hyperlink(self):
    """Test the hyperlink on a ranking chart."""
    query = "Total population in the USA"
    self.driver.get(f"{self.url_}{EXPLORE_URL}#q={query.replace(' ', '+')}")
    shared.wait_for_loading(self.driver)

    ranking_tile = find_elem(self.driver, By.CLASS_NAME, 'ranking-tile')
    self.assertIsNotNone(ranking_tile, "Ranking tile not found")
    scroll_to_elem(self.driver, By.CLASS_NAME, 'ranking-tile')
    
    hyperlink_btn = find_elem(ranking_tile, By.CLASS_NAME, 'custom-link-outlink')
    self.assertIsNotNone(hyperlink_btn, "Hyperlink button not found")

    hyperlink_btn.click()
    self.driver.switch_to.window(self.driver.window_handles[-1])

    expected_params = {
      "chartType": "RANKING_WITH_MAP",
      "sv": "Count_Person",
      "p": "country/USA"
    }
    self._assert_url_params(self.driver.current_url, expected_params)

    self.driver.close()
    self.driver.switch_to.window(self.driver.window_handles[0])

  def test_bar_chart_hyperlink(self):
    """Test the hyperlink on a bar chart from a place page."""
    place_dcid = "country/BRA"
    self.driver.get(f"{self.url_}/place/{place_dcid}")
    shared.wait_for_loading(self.driver)

    bar_chart = find_elem(self.driver, By.CLASS_NAME, "bar-chart")
    self.assertIsNotNone(bar_chart, "Bar chart not found")
    scroll_to_elem(self.driver, By.CLASS_NAME, 'bar-chart')
    
    hyperlink_btn = find_elem(bar_chart, By.CLASS_NAME, 'custom-link-outlink')
    self.assertIsNotNone(hyperlink_btn, "Hyperlink button not found")

    hyperlink_btn.click()
    self.driver.switch_to.window(self.driver.window_handles[-1])

    expected_params = {
      "chartType": "BAR_CHART",
      "p": place_dcid
    }
    self._assert_url_params(self.driver.current_url, expected_params)
    
    self.driver.close()
    self.driver.switch_to.window(self.driver.window_handles[0])

  def test_line_chart_hyperlink(self):
    """Test the hyperlink on a line chart from a place page."""
    place_dcid = "country/BRA"
    self.driver.get(f"{self.url_}/place/{place_dcid}")
    shared.wait_for_loading(self.driver)

    line_chart = shared.wait_elem(self.driver, By.CLASS_NAME, "line-chart")
    self.assertIsNotNone(line_chart, "Line chart not found")
    scroll_to_elem(self.driver, By.CLASS_NAME, 'line-chart')
    
    hyperlink_btn = find_elem(line_chart, By.CLASS_NAME, 'custom-link-outlink')
    self.assertIsNotNone(hyperlink_btn, "Hyperlink button not found")

    hyperlink_btn.click()
    self.driver.switch_to.window(self.driver.window_handles[-1])

    expected_params = {
      "chartType": "TIMELINE_WITH_HIGHLIGHT",
      "p": place_dcid
    }
    self._assert_url_params(self.driver.current_url, expected_params)

    self.driver.close()
    self.driver.switch_to.window(self.driver.window_handles[0])

  def test_facet_selection_hyperlink(self):
    """Test hyperlink after selecting a different facet."""
    query = "Population of France"
    place_dcid = "country/FRA"
    stat_var = "Count_Person"
    import_name = "WikipediaStatsData"
    measurement_method = "Wikipedia"

    self.driver.get(f"{self.url_}{EXPLORE_URL}#q={query.replace(' ', '+')}")
    shared.wait_for_loading(self.driver)

    pop_block = find_elem(self.driver, By.CLASS_NAME, 'block')
    self.assertIsNotNone(pop_block, "Highlight chart not found")

    facet_button = find_elem(pop_block, By.CLASS_NAME, 'source-selector-open-modal-button')
    self.assertIsNotNone(facet_button, "Facet selector button not found")
    facet_button.click()

    shared.wait_elem(self.driver, By.CLASS_NAME, 'source-selector-facet-option-title')

    wiki_label = find_elem(self.driver, By.XPATH, f"//label[contains(., '{import_name}')]")
    self.assertIsNotNone(wiki_label, f"{import_name} option not found")
    
    wiki_input = find_elem(wiki_label, By.TAG_NAME, 'input')
    self.assertIsNotNone(wiki_input, f"{import_name} input not found")
    wiki_input.click()

    update_button = find_elem(self.driver, By.CLASS_NAME, 'source-selector-update-source-button')
    self.assertIsNotNone(update_button, "Update button not found")
    update_button.click()

    shared.wait_for_loading(self.driver)

    hyperlink_btn = find_elem(pop_block, By.CLASS_NAME, 'custom-link-outlink')
    self.assertIsNotNone(hyperlink_btn, "Hyperlink button not found after facet change")

    hyperlink_href = hyperlink_btn.get_attribute('href')
    self.assertIsNotNone(hyperlink_href, "Hyperlink href not found")

    expected_href_params = {
      "chartType": "TIMELINE_WITH_HIGHLIGHT",
      "sv": stat_var,
      "p": place_dcid,
      "imp": import_name,
      "mm": measurement_method
    }
    self._assert_url_params(hyperlink_href, expected_href_params)

    hyperlink_btn.click()
    self.driver.switch_to.window(self.driver.window_handles[-1])
    shared.wait_for_loading(self.driver)

    self._assert_url_params(self.driver.current_url, expected_href_params)

    pop_block_new = find_elem(self.driver, By.CLASS_NAME, 'block')
    self.assertIsNotNone(pop_block_new, "Highlight chart not found in new window")

    facet_button_new = find_elem(pop_block_new, By.CLASS_NAME, 'source-selector-open-modal-button')
    self.assertIsNotNone(facet_button_new, "Facet selector button not found in new window")
    facet_button_new.click()

    shared.wait_elem(self.driver, By.CLASS_NAME, 'source-selector-facet-option-title')

    wiki_label_new = find_elem(self.driver, By.XPATH, f"//label[contains(., '{import_name}')]")
    self.assertIsNotNone(wiki_label_new, f"{import_name} option not found in new window")
    
    wiki_input_new = find_elem(wiki_label_new, By.TAG_NAME, 'input')
    self.assertIsNotNone(wiki_input_new, f"{import_name} input not found in new window")
    self.assertTrue(wiki_input_new.is_selected(), f"{import_name} should be selected in new window")

    self.driver.close()
    self.driver.switch_to.window(self.driver.window_handles[0])
