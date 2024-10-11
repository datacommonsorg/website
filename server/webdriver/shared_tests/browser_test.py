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
import urllib
import urllib.request

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

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
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

    # Wait for title to be present
    title_present = EC.text_to_be_present_in_element((By.TAG_NAME, 'h1'),
                                                     'Knowledge Graph')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    # Assert intro is correct
    intro = self.driver.find_element(By.XPATH,
                                     '//*[@id="browser_landing"]/div/p[1]')
    self.assertTrue(
        intro.text.startswith(
            'The Data Commons Knowledge Graph is constructed'))

  def test_page_serve_ca_population(self):
    """Test the browser page for California population can be loaded successfully."""
    title_text = "Count_Person - California - Knowledge Graph - " + self.dc_title_string

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
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

    # Assert header is correct.
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    statvar_title = self.driver.find_element(By.XPATH, '//*[@id="node"]/h1[1]')
    self.assertEqual(statvar_title.text, 'Statistical Variable: Count_Person')
    about_title = self.driver.find_element(By.XPATH, '//*[@id="node"]/h1[2]')
    self.assertEqual(about_title.text, 'About: California')

    # Assert properties section shows dcid and typeOf values for the statistical variable
    # Count_Person.
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="node-content"]/div[1]/div/table'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    table = self.driver.find_element(
        By.XPATH, '//*[@id="node-content"]/div[1]/div/table')
    dcid_row = table.find_elements(By.XPATH, './/tbody/tr[2]/td')
    self.assertEqual(dcid_row[0].text, 'dcid')
    self.assertEqual(dcid_row[1].text, 'Count_Person')
    type_of_row = table.find_elements(By.XPATH, './/tbody/tr[3]/td')
    self.assertEqual(type_of_row[0].text, 'typeOf')
    self.assertEqual(type_of_row[1].text, 'StatisticalVariable')
    self.assertEqual(type_of_row[2].text, 'datacommons.org')

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
    title_text = ("Austrobaileya scandens C.T.White - Knowledge Graph - " +
                  self.dc_title_string)

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
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

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
    type_of_row = table.find_elements(By.XPATH, './/tbody/tr[3]/td')
    self.assertEqual(type_of_row[0].text, 'typeOf')
    self.assertEqual(type_of_row[1].text, 'BiologicalSpecimen')
    self.assertEqual(type_of_row[2].text, 'nybg.org')

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
    stat_var_search_input_xpath = (
        '//*[@id="stat-var-hierarchy-section"]/div[1]/div[1]/' + 'div/input')
    element_present = EC.presence_of_element_located(
        (By.XPATH, stat_var_search_input_xpath))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    search_input = self.driver.find_element(By.XPATH,
                                            stat_var_search_input_xpath)

    # Search for "male asian " and select the first result
    search_input.send_keys(SEARCH_INPUT)
    loading_finished = EC.invisibility_of_element_located(
        (By.ID, 'sv-search-spinner'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(loading_finished)
    first_result = self.driver.find_element(
        By.XPATH,
        ('//*[@id="stat-var-hierarchy-section"]//div[contains(@class, ' +
         '"statvar-hierarchy-search-results")]/div[2]/div[1]'))
    first_result.click()

    # Assert that the section Count_Person_Male_AsianAlone opened and shows at least one chart
    element_present = EC.presence_of_element_located((By.XPATH, (
        '//div[@class="highlighted-stat-var"]/div/div/div/div/div[@class="card"]'
        + '/div[@class="observation-chart"]')))
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
