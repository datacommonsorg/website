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

import time
import urllib
import urllib.request

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver_tests.base_test import WebdriverBaseTest
import server.webdriver_tests.shared as shared

TIMELINE_URL = '/tools/timeline'
URL_HASH_1 = '#&statsVar=Median_Age_Person__Median_Income_Person__Count_Person_Upto5Years'\
    '__Count_Person_5To17Years&place=geoId/06,geoId/08'
GEO_URL_1 = '#&place=geoId/06'
STATVAR_URL_1 = '#&statsVar=Count_Person'
PLACE_SEARCH_CA = 'California, USA'
PLACE_SEARCH_USA = 'USA'


# Class to test timeline tool.
class TestCharts(WebdriverBaseTest):

  def test_server_and_page(self):
    """Test the server can run successfully."""
    TITLE_TEXT = "Timelines Explorer - Data Commons"

    # Load Timeline Tool page.
    self.driver.get(self.url_ + TIMELINE_URL)

    # Assert 200 HTTP code: successful page load.
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert 200 HTTP code: successful JS generation.
    req = urllib.request.Request(self.url_ + "/timeline.js")
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(TITLE_TEXT))
    self.assertEqual(TITLE_TEXT, self.driver.title)

  def test_charts_original(self):
    """Test the original timeline page. No charts in this page."""
    # Load Timeline Tool page.
    self.driver.get(self.url_ + TIMELINE_URL)

    # Find the group of charts.
    charts = self.driver.find_elements(
        By.XPATH, '//*[@id="chart-region"]/div[@class="chart"]')

    # Assert there is no chart.
    self.assertEqual(len(charts), 0)

    # Assert no card is present since no search has been performed.
    self.assertEqual(len(charts), 0)

  def test_charts_from_url_directly_and_uncheck_statvar(self):
    """Given the url directly, test the menu and charts are shown correctly.
    Then unclick one statvar, test the corresponding change.
    """
    # Load Timeline Tool page with Statistical Variables.
    self.driver.get(self.url_ + TIMELINE_URL + URL_HASH_1)

    # Wait until the group of charts has loaded.
    element_present = EC.presence_of_element_located((By.ID, 'chart-region'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Store a list of all the charts.
    chart_region = self.driver.find_element(By.XPATH, '//*[@id="chart-region"]')
    charts = chart_region.find_elements(By.CLASS_NAME, 'card')
    # Assert there are three charts.
    self.assertEqual(len(charts), 3)
    # Wait until the charts are drawn.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'legend-text'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    # Assert first chart has 4 lines (ie. has data)
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 4)
    # Assert second chart has 2 lines (ie. has data)
    chart_lines = charts[1].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 2)
    # Assert third chart has 2 lines (ie. has data)
    chart_lines = charts[2].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 2)

    # Click on Demographics section to expand it.
    shared.click_sv_group(self.driver, "Demographics")

    # Uncheck median age statvar, and the number of charts will become two.
    element_present = EC.text_to_be_present_in_element(
        (By.ID, 'hierarchy-section'), "Median Age of Population")
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    median_age_checkbox = self.driver.find_element(
        By.XPATH, '//*[text()="Median Age of Population"]')
    median_age_checkbox.click()
    # Check if there is a way to find the chart region refreshed.
    time.sleep(2)

    # Re-store a list of all the charts.
    charts = chart_region.find_elements(By.CLASS_NAME, 'card')
    # Assert there are two charts.
    self.assertEqual(len(charts), 2)

  def test_check_statvar_and_uncheck(self):
    """Test check and uncheck one statvar."""
    # Load Timeline Tool page for California.
    self.driver.get(self.url_ + TIMELINE_URL + GEO_URL_1)

    element_present = EC.presence_of_element_located(
        (By.ID, 'hierarchy-section'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    charts = self.driver.find_elements(
        By.XPATH, '//*[@id="chart-region"]/div[@class="chart-container"]')

    # Assert there is no chart.
    self.assertEqual(len(charts), 0)

    # Expand the Demographics section of the stat var hierarchy.
    shared.click_sv_group(self.driver, "Demographics")

    # Wait until stat vars are present and click on Population.
    shared.wait_for_loading(self.driver)
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, "svg-node-child"))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(
        By.ID, "Count_Persondc/g/Demographics-Count_Person").click()

    # Wait until there is a card present.
    shared.wait_for_loading(self.driver)
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="chart-region"]/div'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Assert there is one chart.
    charts = self.driver.find_elements(
        By.XPATH, '//*[@id="chart-region"]/div[@class="chart-container"]')
    self.assertEqual(len(charts), 1)

    # Uncheck the checked stat var.
    self.driver.find_element(
        By.ID, "Count_Persondc/g/Demographics-Count_Person").click()

    # Assert there are no charts.
    shared.wait_for_loading(self.driver)
    charts = self.driver.find_elements(
        By.XPATH, '//*[@id="chart-region"]/div[@class="chart-container"]')
    self.assertEqual(len(charts), 0)

  def test_place_search_box_and_remove_place(self):
    """Test the timeline tool place search can work correctly."""
    # Load Timeline Tool page with Statistical Variables.
    self.driver.get(self.url_ + TIMELINE_URL + STATVAR_URL_1)

    # Wait until search box is present.
    element_present = EC.presence_of_element_located((By.ID, 'ac'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    search_box_input = self.driver.find_element(By.ID, 'ac')

    # Type California into the search box.
    search_box_input.send_keys(PLACE_SEARCH_CA)

    # Wait until there is at least one result in autocomplete results.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'pac-item'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Click on the first result.
    first_result = self.driver.find_element(By.CSS_SELECTOR,
                                            ".pac-item:nth-child(1)")
    first_result.click()
    # Wait until the first line element within the card is present.
    element_present = EC.presence_of_element_located(
        (By.CSS_SELECTOR, '.line:nth-child(1)'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Type USA into the search box.
    search_box_input.clear()
    search_box_input.send_keys(PLACE_SEARCH_USA)

    # Wait until there is at least one result in autocomplete results.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'pac-item'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Click on the first result.
    first_result = self.driver.find_element(By.CSS_SELECTOR,
                                            ".pac-item:nth-child(1)")
    first_result.click()

    # Wait until the second line element within the card is present.
    element_present = EC.presence_of_element_located(
        (By.CSS_SELECTOR, '.line:nth-child(2)'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Store a list of all the charts and lines.
    charts = self.driver.find_elements(By.XPATH, '//*[@id="chart-region"]/div')
    lines = charts[0].find_elements(By.CLASS_NAME, "line")

    # Assert number of charts and lines is correct.
    self.assertEqual(len(charts), 1)
    self.assertEqual(len(lines), 2)

    # Wait until the delete button is present.
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="place-list"]/div[1]/button'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Click on the delete button and remove California.
    delete_button = self.driver.find_element(
        By.XPATH, '//*[@id="place-list"]/div[1]/button')
    delete_button.click()

    # Wait until the second line element within the card disappears.
    shared.wait_for_loading(self.driver)
    element_present = EC.invisibility_of_element_located(
        (By.CSS_SELECTOR, '.line:nth-child(2)'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Store a list of all the charts and lines.
    charts = self.driver.find_elements(By.XPATH, '//*[@id="chart-region"]/div')
    lines = charts[0].find_elements(By.CLASS_NAME, "line")

    # Assert number of charts and lines is correct.
    self.assertEqual(len(charts), 1)
    self.assertEqual(len(lines), 1)
