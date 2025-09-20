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
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_elem
import server.webdriver.shared as shared

# TODO(juliawu): Remove feature flags once new UI is rolled out to production
TIMELINE_URL = '/tools/timeline?disable_feature=standardized_vis_tool'
STANDARDIZED_TIMELINE_URL = '/tools/timeline?enable_feature=standardized_vis_tool'
URL_HASH_1 = '#&statsVar=Median_Age_Person__Median_Income_Person__Count_Person_Upto5Years'\
    '__Count_Person_5To17Years&place=geoId/06,geoId/08'
GEO_URL_1 = '#&place=geoId/06'
STATVAR_URL_1 = '#&statsVar=Count_Person'
PLACE_SEARCH_CA = 'California, USA'
PLACE_SEARCH_USA = 'USA'


class TimelineTestMixin():
  """Mixins to test the timeline page."""

  def test_server_and_page(self):
    """Test the server can run successfully."""
    title_text = "Timelines Explorer - " + self.dc_title_string

    # Load Timeline Tool page.
    self.driver.get(self.url_ + TIMELINE_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + "/timeline.js"), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

  def test_charts_original(self):
    """Test the original timeline page. No charts in this page."""
    # Load Timeline Tool page.
    self.driver.get(self.url_ + TIMELINE_URL)

    # Find the group of charts.
    charts = find_elems(self.driver,
                        by=By.XPATH,
                        value='//*[@id="chart-region"]/div[@class="chart"]')

    # Assert no card is present since no search has been performed.
    self.assertEqual(len(charts), 0)

  def test_charts_from_url_directly_and_uncheck_statvar(self):
    """Given the url directly, test the menu and charts are shown correctly.
    Then unclick one statvar, test the corresponding change.
    """
    # Load Timeline Tool page with Statistical Variables.
    self.driver.get(self.url_ + TIMELINE_URL + URL_HASH_1)

    # Wait until the group of charts has loaded.
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(shared.charts_rendered)

    # Store a list of all the charts.
    charts = find_elems(self.driver, value='dc-async-element')
    # Assert there are three charts.
    self.assertEqual(len(charts), 3)
    # Wait until the charts are drawn.
    self.assertIsNotNone(wait_elem(self.driver, value='legend-text'))

    # Chart 0 has 4 lines, chart 1 has 2 lines, chart 2 has 2 lines
    chart_index_to_line_count = {0: 4, 1: 2, 2: 2}
    for index, count in chart_index_to_line_count.items():
      self.assertEqual(len(find_elems(charts[index], value='line')), count)

    # Click on Demographics section to expand it.
    shared.click_sv_group(self.driver, "Demographics")

    # Uncheck median age statvar, and the number of charts will become two.
    # Try both possible text variants for the statvar label.
    try:
      find_elem(self.driver,
                by=By.XPATH,
                value='//*[text()="Median age of population"]').click()
    except Exception:
      find_elem(self.driver,
                by=By.XPATH,
                value='//*[text()="Median Age of Population"]').click()

    # Check if there is a way to find the chart region refreshed.
    shared.wait_for_loading(self.driver)

    # Re-store a list of all the charts.
    charts = find_elems(self.driver, value='dc-async-element')
    # Assert there is at least one chart.
    self.assertGreater(len(charts), 0)

  def test_check_statvar_and_uncheck(self):
    """Test check and uncheck one statvar."""
    # Load Timeline Tool page for California.
    self.driver.get(self.url_ + TIMELINE_URL + GEO_URL_1)

    shared.wait_for_loading(self.driver)
    self.assertIsNotNone(
        wait_elem(self.driver, by=By.ID, value='hierarchy-section'))
    charts = find_elems(
        self.driver,
        by=By.XPATH,
        value='//*[@id="chart-region"]/div[@class="chart-container"]')

    # Assert there is no chart.
    self.assertEqual(len(charts), 0)

    # Expand the Demographics section of the stat var hierarchy.
    shared.wait_for_loading(self.driver)
    shared.click_sv_group(self.driver, "Demographics")

    # Wait until stat vars are present and click on Population.
    shared.wait_for_loading(self.driver)
    self.assertIsNotNone(wait_elem(self.driver, value='svg-node-child'))
    find_elem(self.driver,
              by=By.ID,
              value="Count_Persondc/g/Demographics-Count_Person").click()

    # Wait until there is a card present.
    shared.wait_for_loading(self.driver)
    self.assertIsNotNone(wait_elem(self.driver, value='dc-async-element'))

    # Assert there is one chart and on opened hierarchy.
    charts = find_elems(self.driver, value='dc-async-element')
    self.assertEqual(len(charts), 2)

    # Uncheck the checked stat var.
    find_elem(self.driver,
              by=By.ID,
              value="Count_Persondc/g/Demographics-Count_Person").click()

    # Assert there are no charts.
    shared.wait_for_loading(self.driver)
    charts = find_elems(
        self.driver,
        by=By.XPATH,
        value='//*[@id="chart-region"]/div[@class="chart-container"]')
    self.assertEqual(len(charts), 0)

  def test_place_search_box_and_remove_place(self):
    """Test the timeline tool place search can work correctly."""
    # Load Timeline Tool page with Statistical Variables.
    self.driver.get(self.url_ + TIMELINE_URL + STATVAR_URL_1)

    # Search for California
    shared.search_for_places(self,
                             self.driver,
                             PLACE_SEARCH_CA,
                             is_new_vis_tools=False)

    # Wait until the first line element within the card is present.
    shared.wait_for_loading(self.driver)
    self.assertIsNotNone(
        find_elem(self.driver, by=By.CSS_SELECTOR, value='.line:nth-child(1)'))

    shared.search_for_places(self,
                             self.driver,
                             PLACE_SEARCH_USA,
                             is_new_vis_tools=False)

    # Wait until the second line element within the card is present.
    shared.wait_for_loading(self.driver)
    self.assertIsNotNone(
        find_elem(self.driver, by=By.CSS_SELECTOR, value='.line:nth-child(2)'))

    # Store a list of all the charts and lines.
    charts = find_elems(self.driver,
                        by=By.XPATH,
                        value='//*[@id="chart-region"]/div')
    lines = find_elems(charts[0], value="line")

    # Assert number of charts and lines is correct.
    self.assertEqual(len(charts), 1)
    self.assertEqual(len(lines), 2)

    # Wait until the delete button is present.
    self.assertIsNotNone(
        wait_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="place-list"]/div[1]/button'))

    # Click on the delete button and remove California.
    find_elem(self.driver,
              by=By.XPATH,
              value='//*[@id="place-list"]/div[1]/button').click()

    # Wait until the second line element within the card disappears.
    shared.wait_for_loading(self.driver)
    element_present = EC.invisibility_of_element_located(
        (By.CSS_SELECTOR, '.line:nth-child(2)'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Store a list of all the charts and lines.
    charts = find_elems(self.driver,
                        by=By.XPATH,
                        value='//*[@id="chart-region"]/div')
    lines = find_elems(charts[0], value="line")

    # Assert number of charts and lines is correct.
    self.assertEqual(len(charts), 1)
    self.assertEqual(len(lines), 1)


class StandardizedTimelineTestMixin():

  def test_server_and_page(self):
    """Test the server can run successfully."""
    title_text = "Timeline Explorer - " + self.dc_title_string
    self.driver.get(self.url_ + STANDARDIZED_TIMELINE_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/map.js'), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

  def test_can_enter_and_remove_places(self):
    """Test that multiple places can be entered in the place search bar and
    that removing a chip also removes the place."""
    # Load map page and wait for it to load
    self.driver.get(self.url_ + STANDARDIZED_TIMELINE_URL)
    shared.wait_for_loading(self.driver)

    # Search for California
    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type=None,
                             is_new_vis_tools=False)

    # Assert these values are in the URL
    current_url = self.driver.current_url
    self.assertTrue("place=geoId%2F06"
                    in current_url)  # look for "place=geoId/06"

    # Search for Texas
    shared.search_for_places(self,
                             self.driver,
                             search_term="Texas",
                             place_type=None,
                             is_new_vis_tools=False)

    # Assert both California and Texas are in the URL
    current_url = self.driver.current_url
    self.assertTrue("geoId%2F06" in current_url)  # look for "geoId/06"
    self.assertTrue("geoId%2F48" in current_url)  # look for "geoId/48"

    # Remove California by clicking the X on the chip
    # California is the first chip
    shared.click_el(self.driver, (By.CLASS_NAME, "chip-action"))

    # Assert only Texas is in the URL
    current_url = self.driver.current_url
    self.assertTrue("geoId%2F48" in current_url)  # look for "geoId/48"
    self.assertFalse("geoId%2F06"
                     in current_url)  # "geoId/06" should be removed from url

  @pytest.mark.one_at_a_time
  def test_manually_enter_options_results_in_chart(self):
    """Test entering place and stat var options manually will cause chart to
    show up.
    """
    self.driver.get(self.url_ + STANDARDIZED_TIMELINE_URL)

    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type=None,
                             is_new_vis_tools=False)

    # Choose stat var
    shared.click_sv_group(self.driver, "Demographics")
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    shared.wait_for_loading(self.driver)

    # Assert number of charts and lines is correct.
    charts = find_elems(self.driver,
                        by=By.XPATH,
                        value='//*[@id="chart-region"]/div')
    self.assertEqual(len(charts), 1)
    lines = find_elems(charts[0], value="line")
    self.assertEqual(len(lines), 1)
