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

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base import WebdriverBaseTest
import server.webdriver.shared as shared

MTV_URL = '/browser/geoId/0649670'
CA_POPULATION_URL = '/browser/geoId/06?statVar=Count_Person'
AUSTROBAILEYA_URL = '/browser/dc/bsmvthtq89217'
LANDING_PAGE_URL = '/browser'
SEARCH_INPUT = 'male asian count '


# Class to test Graph Browser.
class TestBrowser(WebdriverBaseTest):

  def test_page_landing(self):
    """Test the browser landing page can be loaded successfully."""
    TITLE_TEXT = "Graph Browser - Data Commons"

    # Load landing page.
    self.driver.get(self.url_ + LANDING_PAGE_URL)

    # Assert 200 HTTP code: successful page load.
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(TITLE_TEXT))
    self.assertEqual(TITLE_TEXT, self.driver.title)

    # Wait for title to be present
    title_present = EC.text_to_be_present_in_element((By.TAG_NAME, 'h1'),
                                                     'Graph Browser')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    # Assert intro is correct
    intro = self.driver.find_element(By.XPATH,
                                     '//*[@id="browser_landing"]/div/p[1]')
    self.assertTrue(
        intro.text.startswith('The Data Commons Graph is constructed'))

  def test_page_serve_mtv(self):
    """Test the browser page for MTV can be loaded successfully."""
    TITLE_TEXT = "Mountain View - Graph Browser - Data Commons"

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
                  self.TIMEOUT_SEC).until(EC.title_contains(TITLE_TEXT))
    self.assertEqual(TITLE_TEXT, self.driver.title)

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
    typeOf_row = table.find_elements(By.XPATH, './/tbody/tr[3]/td')
    self.assertEqual(typeOf_row[0].text, 'typeOf')
    self.assertEqual(typeOf_row[1].text, 'City')
    self.assertEqual(typeOf_row[2].text, 'www.wikidata.org')

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

  def test_page_serve_ca_population(self):
    """Test the browser page for California population can be loaded successfully."""
    TITLE_TEXT = "Count_Person - California - Graph Browser - Data Commons"

    # Load California population browser page.
    self.driver.get(self.url_ + CA_POPULATION_URL)

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
                  self.TIMEOUT_SEC).until(EC.title_contains(TITLE_TEXT))
    self.assertEqual(TITLE_TEXT, self.driver.title)

    # Assert header is correct.
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    statvar_title = self.driver.find_element(By.XPATH, '//*[@id="node"]/h1[1]')
    self.assertEqual(statvar_title.text, 'Statistical Variable: Count_Person')
    about_title = self.driver.find_element(By.XPATH, '//*[@id="node"]/h1[2]')
    self.assertEqual(about_title.text, 'About: California')

    # Assert properties section shows dcid and typeOf values for the statistical variable Count_Person.
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="node-content"]/div[1]/div/table'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    table = self.driver.find_element(
        By.XPATH, '//*[@id="node-content"]/div[1]/div/table')
    dcid_row = table.find_elements(By.XPATH, './/tbody/tr[2]/td')
    self.assertEqual(dcid_row[0].text, 'dcid')
    self.assertEqual(dcid_row[1].text, 'Count_Person')
    typeOf_row = table.find_elements(By.XPATH, './/tbody/tr[3]/td')
    self.assertEqual(typeOf_row[0].text, 'typeOf')
    self.assertEqual(typeOf_row[1].text, 'StatisticalVariable')
    self.assertEqual(typeOf_row[2].text, 'datacommons.org')

    # Assert observation charts loaded.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'observation-chart'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    observations_section = self.driver.find_element(
        By.XPATH, '//*[@id="node-content"]/div[2]')
    observations = observations_section.find_elements(By.CLASS_NAME, 'card')
    self.assertTrue(len(observations) > 0)

  def test_page_serve_austrobaileya(self):
    """Test the browser page for Austrobaileya scandens can be loaded successfully."""
    TITLE_TEXT = "Austrobaileya scandens C.T.White - Graph Browser - Data Commons"

    # Load Austrobaileya browser page.
    self.driver.get(self.url_ + AUSTROBAILEYA_URL)

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
                  self.TIMEOUT_SEC).until(EC.title_contains(TITLE_TEXT))
    self.assertEqual(TITLE_TEXT, self.driver.title)

    # Assert header is correct.
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    title = self.driver.find_element(By.XPATH, '//*[@id="node"]/h1')
    self.assertEqual(title.text, 'About: Austrobaileya scandens C.T.White')
    dcid_subtitle = self.driver.find_element(By.XPATH, '//*[@id="node"]/h2[1]')
    self.assertEqual(dcid_subtitle.text, 'dcid: dc/bsmvthtq89217')
    typeOf_subtitle = self.driver.find_element(By.XPATH,
                                               '//*[@id="node"]/h2[2]')
    self.assertEqual(typeOf_subtitle.text, 'typeOf: BiologicalSpecimen')

    # Assert properties contains correct dcid and typeOf
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="node-content"]/div[1]/div/table'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    table = self.driver.find_element(
        By.XPATH, '//*[@id="node-content"]/div[1]/div/table')
    dcid_row = table.find_elements(By.XPATH, './/tbody/tr[2]/td')
    self.assertEqual(dcid_row[0].text, 'dcid')
    self.assertEqual(dcid_row[1].text, 'dc/bsmvthtq89217')
    typeOf_row = table.find_elements(By.XPATH, './/tbody/tr[3]/td')
    self.assertEqual(typeOf_row[0].text, 'typeOf')
    self.assertEqual(typeOf_row[1].text, 'BiologicalSpecimen')
    self.assertEqual(typeOf_row[2].text, 'nybg.org')

    # Assert image loaded.
    element_present = EC.presence_of_element_located(
        (By.ID, 'browser-image-section'))
    WebDriverWait(self.driver, 2 * self.TIMEOUT_SEC).until(element_present)
    image_section = self.driver.find_element(By.ID, 'browser-image-section')
    image = image_section.find_element(By.TAG_NAME, 'img')
    self.assertTrue(image)

  def test_stat_var_hierarchy(self):
    """Test that the stat var hierarchy can search properly"""
    # Load MTV browser page.
    self.driver.get(self.url_ + MTV_URL)

    # Wait for the search box of the statvar hierarchy section to be present
    STAT_VAR_SEARCH_INPUT_XPATH = '//*[@id="stat-var-hierarchy-section"]/div[1]/div[1]/div/input'
    element_present = EC.presence_of_element_located(
        (By.XPATH, STAT_VAR_SEARCH_INPUT_XPATH))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    search_input = self.driver.find_element(By.XPATH,
                                            STAT_VAR_SEARCH_INPUT_XPATH)

    # Search for "male asian " and select the first result
    search_input.send_keys(SEARCH_INPUT)
    loading_finished = EC.invisibility_of_element_located(
        (By.ID, 'sv-search-spinner'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(loading_finished)
    first_result = self.driver.find_element(
        By.XPATH,
        '//*[@id="stat-var-hierarchy-section"]/div[1]/div[1]/div[2]/div/div[1]')
    first_result.click()

    # Assert that the section Count_Person_Male_AsianAlone opened and shows at least one chart
    element_present = EC.presence_of_element_located((
        By.XPATH,
        '//div[@class="highlighted-stat-var"]/div/div/div/div/div[@class="card"]/div[@class="observation-chart"]'
    ))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    chart_title = self.driver.find_element(
        By.XPATH, '//div[@class="highlighted-stat-var"]/div/div/div/h5/a')
    self.assertEqual(
        chart_title.text,
        'Count_Person_Male_AsianAlone for Mountain Viewopen_in_new')
    self.assertTrue(chart_title.text.startswith('Count_Person_Male_AsianAlone'))
    charts_section = self.driver.find_element(By.CLASS_NAME,
                                              'statvars-charts-section')
    observation_charts = charts_section.find_elements(By.CLASS_NAME,
                                                      'observation-chart')
    self.assertTrue(len(observation_charts) > 0)

  def test_observation_table_redirect(self):
    """Test that the observation table observation row links can redirect properly"""
    # Load California population browser page.
    self.driver.get(self.url_ + CA_POPULATION_URL)

    # Wait for observation charts to be loaded.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'observation-chart'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    observations_section = self.driver.find_element(
        By.XPATH, '//*[@id="node-content"]/div[2]')

    # Switch to table view for the first chart
    observation_section_chart_1 = observations_section.find_elements(
        By.CLASS_NAME, 'card')[0]
    table_view_button = observation_section_chart_1.find_element(
        By.TAG_NAME, 'button')
    table_view_button.click()

    # Click the first row in the table view to open the browser page for that observation
    table = observation_section_chart_1.find_element(By.TAG_NAME, 'table')
    first_row = table.find_element(By.XPATH, './/tbody/tr[2]/td')
    first_row.click()

    # Wait for the new page to open in a new tab
    new_page_opened = EC.number_of_windows_to_be(2)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(new_page_opened)

    # Switch tabs to the page for the observation
    new_page = self.driver.window_handles[-1]
    self.driver.switch_to.window(new_page)

    # Assert the title of the new page is correct
    NEW_PAGE_TITLE = 'dc/o/y54f4zvqrzf67 - Graph Browser - Data Commons'
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(NEW_PAGE_TITLE))
    self.assertEqual(NEW_PAGE_TITLE, self.driver.title)

    # Assert header of the new page is correct.
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    about_title = self.driver.find_element(By.XPATH, '//*[@id="node"]/h1')
    self.assertEqual(about_title.text, 'About: dc/o/y54f4zvqrzf67')
    dcid_subtitle = self.driver.find_element(By.XPATH, '//*[@id="node"]/h2[1]')
    self.assertEqual(dcid_subtitle.text, 'dcid: dc/o/y54f4zvqrzf67')
    typeOf_subtitle = self.driver.find_element(By.XPATH,
                                               '//*[@id="node"]/h2[2]')
    self.assertEqual(typeOf_subtitle.text, 'typeOf: StatVarObservation')

  def test_observation_chart_redirect(self):
    """Test that the observation chart observation node links can redirect properly"""
    # Load California population browser page.
    self.driver.get(self.url_ + CA_POPULATION_URL)
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="node-content"]/div[1]/div/table'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Click the point on the chart for the year 1850
    element_present = EC.presence_of_element_located((
        By.XPATH,
        '//*[@id="node-content"]/div[2]/div/div[1]/div[2]/div/div[2]/*[name()="svg"]/*[name()="g"][4]/*[name()="g"]/*[name()="circle"][1]'
    ))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    point = self.driver.find_element(
        By.XPATH,
        '//*[@id="node-content"]/div[2]/div/div[1]/div[2]/div/div[2]/*[name()="svg"]/*[name()="g"][4]/*[name()="g"]/*[name()="circle"][1]'
    )
    point.click()

    # Wait for the new page to open in a new tab
    new_page_opened = EC.number_of_windows_to_be(2)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(new_page_opened)

    # Switch tabs to the page for the observation
    new_page = self.driver.window_handles[-1]
    self.driver.switch_to.window(new_page)

    # Assert the title of the new page is correct
    NEW_PAGE_TITLE = 'dc/o/y54f4zvqrzf67 - Graph Browser - Data Commons'
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(NEW_PAGE_TITLE))
    self.assertEqual(NEW_PAGE_TITLE, self.driver.title)

    # Assert header of the new page is correct.
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    about_title = self.driver.find_element(By.XPATH, '//*[@id="node"]/h1')
    self.assertEqual(about_title.text, 'About: dc/o/y54f4zvqrzf67')
    dcid_subtitle = self.driver.find_element(By.XPATH, '//*[@id="node"]/h2[1]')
    self.assertEqual(dcid_subtitle.text, 'dcid: dc/o/y54f4zvqrzf67')
    typeOf_subtitle = self.driver.find_element(By.XPATH,
                                               '//*[@id="node"]/h2[2]')
    self.assertEqual(typeOf_subtitle.text, 'typeOf: StatVarObservation')
