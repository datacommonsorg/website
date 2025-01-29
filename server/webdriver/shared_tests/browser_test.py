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
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import scroll_to_elem
from server.webdriver.base_utils import wait_elem

MTV_URL = '/browser/geoId/0649670'
CA_POPULATION_URL = '/browser/geoId/06?statVar=Count_Person'
AUSTROBAILEYA_URL = '/browser/dc/bsmvthtq89217'
LANDING_PAGE_URL = '/browser'
SEARCH_INPUT = 'male asian count '


class BrowserTestMixin():
  """Mixins to test browser page."""

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
    node = find_elem(self.driver, by=By.XPATH, value='//*[@id="node"]')
    self.assertEqual(
        find_elem(node, by=By.XPATH, value='./h1[1]').text,
        'Statistical Variable: Count_Person')
    self.assertEqual(
        find_elem(node, by=By.XPATH, value='./h1[2]').text, 'About: California')

    # Assert properties section shows dcid and typeOf values for the statistical variable
    # Count_Person.
    table = find_elem(self.driver,
                      by=By.XPATH,
                      value='//*[@id="node-content"]/div[1]/div/table')
    dcid_row = find_elems(table, by=By.XPATH, value='./tbody/tr[2]/td')
    self.assertEqual(dcid_row[0].text, 'dcid')
    self.assertEqual(dcid_row[1].text, 'Count_Person')
    type_of_row = find_elems(table, by=By.XPATH, value='./tbody/tr[3]/td')
    self.assertEqual(type_of_row[0].text, 'typeOf')
    self.assertEqual(type_of_row[1].text, 'StatisticalVariable')
    self.assertEqual(type_of_row[2].text, 'datacommons.org')

    # Assert observation charts loaded.
    observations_section = find_elem(self.driver,
                                     by=By.XPATH,
                                     value='//*[@id="node-content"]/div[2]')
    self.assertGreater(len(find_elems(observations_section, value='card')), 0)

  def test_page_serve_austrobaileya(self):
    """Test the browser page for Austrobaileya scandens can be loaded successfully."""
    title_text = ("Austrobaileya scandens C.T.White - Knowledge Graph - " +
                  self.dc_title_string)

    # Load Austrobaileya browser page.
    self.driver.get(self.url_ + AUSTROBAILEYA_URL)

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
        find_elem(self.driver, by=By.TAG_NAME, value='h1').text,
        'About: Austrobaileya scandens C.T.White')
    self.assertEqual(
        find_elem(self.driver, by=By.XPATH, value='//*[@id="node"]/h2[1]').text,
        'dcid: dc/bsmvthtq89217')
    self.assertEqual(
        find_elem(self.driver, by=By.XPATH, value='//*[@id="node"]/h2[2]').text,
        'typeOf: BiologicalSpecimen')

    # Assert properties contains correct dcid and typeOf
    table = find_elem(self.driver, By.XPATH,
                      '//*[@id="node-content"]/div[1]/div/table')
    dcid_row = find_elems(table, by=By.XPATH, value='./tbody/tr[2]/td')
    self.assertEqual(dcid_row[0].text, 'dcid')
    self.assertEqual(dcid_row[1].text, 'dc/bsmvthtq89217')
    type_of_row = find_elems(table, by=By.XPATH, value='./tbody/tr[3]/td')
    self.assertEqual(type_of_row[0].text, 'typeOf')
    self.assertEqual(type_of_row[1].text, 'BiologicalSpecimen')
    self.assertEqual(type_of_row[2].text, 'nybg.org')

    # Assert image loaded.
    image_section = find_elem(self.driver,
                              by=By.ID,
                              value='browser-image-section')
    image = find_elem(image_section, By.TAG_NAME, 'img')
    self.assertIsNotNone(image)

  def test_stat_var_hierarchy(self):
    """Test that the stat var hierarchy can search properly"""
    # Load MTV browser page.
    self.driver.get(self.url_ + MTV_URL)

    # Wait for the search box of the statvar hierarchy section to be present
    sv_hierarchy_section = find_elem(self.driver, By.ID,
                                     'stat-var-hierarchy-section')
    search_input = find_elem(sv_hierarchy_section, By.TAG_NAME, 'input')

    # Search for "male asian " and select the first result
    search_input.send_keys(SEARCH_INPUT)
    wait_elem(self.driver, By.ID, 'sv-search-spinner')
    sv_hierarchy_results_section = scroll_to_elem(
        self.driver, value='statvar-hierarchy-search-results')

    first_result = find_elem(sv_hierarchy_results_section, By.XPATH,
                             './div[2]/div[1]')
    first_result.click()

    # Assert that the section Count_Person_Male_AsianAlone opened and shows at least one chart
    highlighted_sv = find_elem(self.driver, value='highlighted-stat-var')
    wait_elem(highlighted_sv, value='observation-chart')
    chart_title = find_elem(highlighted_sv,
                            by=By.XPATH,
                            value='./div/div/div/h5/a')
    self.assertEqual(
        chart_title.text,
        'Count_Person_Male_AsianAlone for Mountain Viewopen_in_new')

    # Assert has at least one observation.
    charts_section = find_elem(self.driver, value='statvars-charts-section')
    self.assertTrue(
        len(find_elems(charts_section, value='observation-chart')) > 0)
