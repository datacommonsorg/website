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

import urllib
import urllib.request

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.base_utils import find_elem
import server.webdriver.shared as shared
from server.webdriver.shared_tests.browser_test import BrowserTestMixin

MTV_URL = '/browser/geoId/0649670'
CA_POPULATION_URL = '/browser/geoId/06?statVar=Count_Person'
AUSTROBAILEYA_URL = '/browser/dc/bsmvthtq89217'
LANDING_PAGE_URL = '/browser'
SEARCH_INPUT = 'male asian count '


class TestBrowser(BrowserTestMixin, BaseDcWebdriverTest):
  """Class to test browser page. Some tests come from BrowserTestMixin."""

  @pytest.mark.skip(reason="needs mixer/data fix")
  def test_page_serve_mtv(self):
    """Test the browser page for MTV can be loaded successfully."""
    title_text = "Mountain View - Knowledge Graph - " + self.dc_title_string

    # Load MTV browser page.
    self.driver.get(self.url_ + MTV_URL)

    # Assert 200 HTTP code: successful page load.
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert 200 HTTP code: successful JS generation.
    req = urllib.request.Request(self.url_ + "/browser.js")
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

    # Assert header is correct.
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    title = self.driver.find_element(By.XPATH, '//*[@id="node"]/h1')
    self.assertEqual(title.text, 'About: Mountain View')
    dcid_subtitle = self.driver.find_element(By.XPATH, '//*[@id="node"]/h2[1]')
    self.assertEqual(dcid_subtitle.text, 'dcid: geoId/0649670')
    typeOf_subtitle = self.driver.find_element(By.XPATH,
                                               '//*[@id="node"]/h2[2]')
    self.assertEqual(typeOf_subtitle.text, 'typeOf: City')

    # Assert properties contains correct dcid and typeOf
    shared.wait_for_loading(self.driver)
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="node-content"]/div[1]/div/table'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    table = self.driver.find_element(
        By.XPATH, '//*[@id="node-content"]/div[1]/div/table')
    dcid_row = table.find_elements(By.XPATH, './/tbody/tr[2]/td')
    self.assertEqual(dcid_row[0].text, 'dcid')
    self.assertEqual(dcid_row[1].text, 'geoId/0649670')
    type_of_row = table.find_elements(By.XPATH, './/tbody/tr[3]/td')
    self.assertEqual(type_of_row[0].text, 'typeOf')
    self.assertEqual(type_of_row[1].text, 'City')
    self.assertEqual(type_of_row[2].text, 'www.wikidata.org')

    # Assert stat var hierarchy loaded
    element_present = EC.presence_of_element_located(
        (By.ID, 'stat-var-hierarchy-section'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    sv_hierarchy_section = self.driver.find_element(
        By.ID, 'stat-var-hierarchy-section')
    sv_hierarchy_container = sv_hierarchy_section.find_elements(
        By.XPATH, '//*[@id="stat-var-hierarchy-section"]/div')
    self.assertTrue(len(sv_hierarchy_container) > 0)

    # Assert in arcs loaded
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="browser-in-arc-section"]/div[@class="card p-0"]'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    in_arc_section = self.driver.find_element(By.ID, 'browser-in-arc-section')
    in_arc_cards = in_arc_section.find_elements(By.CLASS_NAME, 'card')
    self.assertTrue(len(in_arc_cards) > 0)

  def test_observation_table_redirect(self):
    """Test that the observation table observation row links can redirect properly"""
    # Load California population browser page.
    self.driver.get(self.url_ + CA_POPULATION_URL)

    # Wait for observation charts to be loaded.
    self.assertIsNotNone(find_elem(self.driver, value='observation-chart'))
    observations_section = find_elem(self.driver,
                                     by=By.XPATH,
                                     value='//*[@id="node-content"]/div[2]')

    # Switch to table view for the first chart
    observation_section_chart_1 = find_elem(observations_section, value='card')
    table_view_button = find_elem(observation_section_chart_1,
                                  by=By.TAG_NAME,
                                  value='button')
    table_view_button.click()

    # Click the first row in the table view to open the browser page for that observation
    table = find_elem(observation_section_chart_1,
                      by=By.TAG_NAME,
                      value='table')
    first_row = find_elem(table,
                          by=By.XPATH,
                          value='.//tbody/tr[2]/td')
    first_row.click()

    # Wait for the new page to open in a new tab
    new_page_opened = EC.number_of_windows_to_be(2)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(new_page_opened)

    # Switch tabs to the page for the observation
    new_page = self.driver.window_handles[-1]
    self.driver.switch_to.window(new_page)

    # Assert the title of the new page is correct
    new_page_title = 'dc/o/y54f4zvqrzf67 - Knowledge Graph - ' + self.dc_title_string
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(new_page_title))
    self.assertEqual(new_page_title, self.driver.title)

    # Assert header of the new page is correct.
    node = find_elem(self.driver, by=By.XPATH, value='//*[@id="node"]')
    self.assertEqual(
        find_elem(node, by=By.XPATH, value='.//h1').text,
        'About: dc/o/y54f4zvqrzf67')  # about title.
    self.assertEqual(
        find_elem(node, by=By.XPATH, value='.//h2[1]').text,
        'dcid: dc/o/y54f4zvqrzf67')  # dcid subtitle
    self.assertEqual(
        find_elem(node, by=By.XPATH, value='.//h2[2]').text,
        'typeOf: StatVarObservation')  # typeOf_subtitle

  def test_observation_chart_redirect(self):
    """Test that the observation chart observation node links can redirect properly"""
    # Load California population browser page.
    self.driver.get(self.url_ + CA_POPULATION_URL)
    self.assertIsNotNone(find_elem(self.driver, by=By.XPATH, value='//*[@id="node-content"]/div[1]/div/table'))

    # Click the point on the chart for the year 1850
    point = find_elem(self.driver, by=By.XPATH, value='//*[@id="node-content"]/div[2]/div/div[1]/div[2]/div/div[2]/div/*[name()="svg"]/'
        + '*[name()="g"][4]/*[name()="g"]/*[name()="circle"][1]')
    point.click()

    # Wait for the new page to open in a new tab
    new_page_opened = EC.number_of_windows_to_be(2)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(new_page_opened)

    # Switch tabs to the page for the observation
    new_page = self.driver.window_handles[-1]
    self.driver.switch_to.window(new_page)

    # Assert the title of the new page is correct
    new_page_title = 'dc/o/y54f4zvqrzf67 - Knowledge Graph - ' + self.dc_title_string
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(new_page_title))
    self.assertEqual(new_page_title, self.driver.title)

    # Assert header of the new page is correct.
    node = find_elem(self.driver, by=By.XPATH, value='//*[@id="node"]')
    self.assertEqual(
        find_elem(node, by=By.XPATH, value='.//h1').text,
        'About: dc/o/y54f4zvqrzf67')  # about title.
    self.assertEqual(
        find_elem(node, by=By.XPATH, value='.//h2[1]').text,
        'dcid: dc/o/y54f4zvqrzf67')  # dcid subtitle
    self.assertEqual(
        find_elem(node, by=By.XPATH, value='.//h2[2]').text,
        'typeOf: StatVarObservation')  # typeOf_subtitle
