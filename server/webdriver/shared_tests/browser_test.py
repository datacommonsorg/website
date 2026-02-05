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

from server.webdriver import shared
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import scroll_to_elem
from server.webdriver.base_utils import wait_elem

MTV_URL = '/browser/geoId/0649670'
CA_POPULATION_URL = '/browser/geoId/06?statVar=Count_Person'
LANDING_PAGE_URL = '/browser'
SEARCH_INPUT = 'male asian count '


class BrowserTestMixin():
  """Mixins to test browser page."""

  @pytest.mark.smoke_test
  def test_page_landing(self):
    """Test the browser landing page can be loaded successfully."""
    title_text = "Knowledge Graph - " + self.dc_title_string

    # Load landing page.
    self.driver.get(self.url_ + LANDING_PAGE_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert page title is correct
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertIn(title_text, self.driver.title)

    # Wait for title to be present
    self.assertEqual(
        find_elem(self.driver, by=By.TAG_NAME, value='h1').text,
        "Knowledge Graph")

    # Assert intro is correct
    self.assertTrue(
        find_elem(self.driver,
                  by=By.XPATH,
                  value="//h1[text()='Knowledge Graph']/following-sibling::p").
        text.startswith("The Data Commons Knowledge Graph is constructed"))

  def test_page_serve_ca_population(self):
    """Test the browser page for California population can be loaded successfully."""
    title_text = "Count_Person - California - Knowledge Graph - " + self.dc_title_string

    # Load California population browser page.
    self.driver.get(self.url_ + CA_POPULATION_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + "/browser.js"), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

    # Assert header is correct.
    self.assertEqual(
        find_elem(self.driver, by=By.XPATH, value='//*[@id="node"]/h1[1]').text,
        'Statistical Variable: Count_Person')
    self.assertEqual(
        find_elem(self.driver, by=By.XPATH, value='//*[@id="node"]/h1[2]').text,
        'About: California')

    # Assert properties section shows dcid and typeOf values for the statistical variable
    # Count_Person.
    dcid_row = find_elems(
        self.driver,
        by=By.XPATH,
        value='//*[@id="node-content"]/div[1]/div/table/tbody/tr[2]/td')
    self.assertEqual(dcid_row[0].text, 'dcid')
    self.assertEqual(dcid_row[1].text, 'Count_Person')
    type_of_row = find_elems(
        self.driver,
        by=By.XPATH,
        value='//*[@id="node-content"]/div[1]/div/table/tbody/tr[3]/td')
    self.assertEqual(type_of_row[0].text, 'typeOf')
    self.assertEqual(type_of_row[1].text, 'StatisticalVariable')
    self.assertEqual(type_of_row[2].text, 'datacommons.org')

    # Assert observation charts loaded.
    self.assertGreater(
        len(
            find_elems(
                self.driver,
                by=By.XPATH,
                value='//*[@id="node-content"]/div[2]//*[@class="card"]')), 0)

  def test_stat_var_hierarchy(self):
    """Test that the stat var hierarchy can search properly"""
    # Load MTV browser page.
    self.driver.get(self.url_ + MTV_URL)

    # Wait for the search box of the statvar hierarchy section to be present
    search_input = find_elem(self.driver, By.CSS_SELECTOR,
                             '#stat-var-hierarchy-section input')

    # Search for "male asian " and select the first result
    search_input.send_keys(SEARCH_INPUT)
    sv_hierarchy_results_section = scroll_to_elem(
        self.driver, value='statvar-hierarchy-search-results')

    first_result = find_elem(
        self.driver, By.CSS_SELECTOR,
        ".statvar-hierarchy-search-results > div:nth-child(2) > div:nth-child(1)"
    )
    first_result_name = first_result.text.strip()
    first_result.click()

    # Assert that the highlighted node title matches the search result that was
    # clicked.
    highlighted_node_title = find_elem(self.driver, By.CSS_SELECTOR,
                                       '.highlighted-node-title .title')
    self.assertEqual(highlighted_node_title.text.strip(), first_result_name)

    # Assert that the section for the clicked stat var opened and shows at
    # least one chart
    wait_elem(self.driver,
              By.CSS_SELECTOR,
              value='.highlighted-stat-var .observation-chart')

    # Assert has at least one observation.
    self.assertTrue(
        len(
            find_elems(self.driver,
                       By.CSS_SELECTOR,
                       value='.statvars-charts-section .observation-chart')) >
        0)
