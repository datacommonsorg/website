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

from server.webdriver_tests.base_test import WebdriverBaseTest

BASE_PAGE_URL = '/event/'
CYCLONE_NICOLE_DCID = 'cyclone/ibtracs_2022309N16290'
DOUBLE_CREEK_FIRE_DCID = 'fire/irwinId/92b22838-c96c-4b21-b1e8-f09e8ee65c8f'
DROUGHT_EVENT_DCID = 'droughtEvent/2020-04-01_grid_1/52_-81'


# Class to test Event Pages.
class TestEventPage(WebdriverBaseTest):

  def test_page_cyclone(self):
    """Test a cyclone event page can be loaded successfully"""

    # Load event page for cyclone Nicole.
    self.driver.get(self.url_ + BASE_PAGE_URL + CYCLONE_NICOLE_DCID)

    # Assert 200 HTTP code: successful page load.
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains('Nicole - Event Page - Data Commons'))

    # Check header section
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    title = self.driver.find_element(By.XPATH,
                                     '//*[@id="main-pane"]/div[1]/div[1]/h1')
    self.assertEqual(title.text, 'Nicole')
    dcid_subtitle = self.driver.find_element(
        By.XPATH, '//*[@id="main-pane"]/div[1]/div[1]/h3')
    self.assertEqual(dcid_subtitle.text,
                     'Cyclone Event in Indian River County, Earth')

    # Check google map section
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'map-container'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    iframe_list = self.driver.find_elements(By.TAG_NAME, 'iframe')
    # assert there is 1 iframe
    self.assertEqual(len(iframe_list), 1)

    # Check property values table
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="main-pane"]/div[1]/section/div/table'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    table = self.driver.find_element(
        By.XPATH, '//*[@id="main-pane"]/div[1]/section/div/table')
    table_rows = table.find_elements(
        By.XPATH, '//*[@id="main-pane"]/div[1]/section/div/table/tbody/tr')
    # assert there are 3+ rows in the property values table
    self.assertGreater(len(table_rows), 3)
    date_row = table.find_elements(
        By.XPATH,
        '//*[@id="main-pane"]/div[1]/section/div/table/tbody/tr[2]/td')
    # assert the date is correct
    self.assertEqual(date_row[0].text, 'Date')
    self.assertEqual(date_row[1].text,
                     '2022-11-05T06:00:00 — 2022-11-11T18:00:00')

    # Check additional charts section
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'svg'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    chart_section = self.driver.find_element(By.ID, 'subject-page-main-pane')
    charts = chart_section.find_elements(By.CLASS_NAME, 'chart-container')
    # assert there are 4+ charts
    self.assertGreater(len(charts), 4)
    # assert that the first chart has data
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 1)

  def test_page_fire(self):
    """Test a fire event page can be loaded successfully"""

    # Load event page for cyclone Nicole.
    self.driver.get(self.url_ + BASE_PAGE_URL + DOUBLE_CREEK_FIRE_DCID)

    # Assert 200 HTTP code: successful page load.
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains('Double Creek Fire - Event Page - Data Commons'))

    # Check header section
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    title = self.driver.find_element(By.XPATH,
                                     '//*[@id="main-pane"]/div[1]/div[1]/h1')
    self.assertEqual(title.text, 'Double Creek Fire')
    dcid_subtitle = self.driver.find_element(
        By.XPATH, '//*[@id="main-pane"]/div[1]/div[1]/h3')
    self.assertEqual(dcid_subtitle.text,
                     'Wildland Fire Event in Wallowa County, Earth')

    # Check google map section
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'map-container'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    iframe_list = self.driver.find_elements(By.TAG_NAME, 'iframe')
    # assert there is 1 iframe
    self.assertEqual(len(iframe_list), 1)

    # Check property values table
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="main-pane"]/div[1]/section/div/table'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    table = self.driver.find_element(
        By.XPATH, '//*[@id="main-pane"]/div[1]/section/div/table')
    table_rows = table.find_elements(
        By.XPATH, '//*[@id="main-pane"]/div[1]/section/div/table/tbody/tr')
    # assert there are 3+ rows in the property values table
    self.assertGreater(len(table_rows), 3)
    date_row = table.find_elements(
        By.XPATH,
        '//*[@id="main-pane"]/div[1]/section/div/table/tbody/tr[2]/td')
    # assert the date is correct
    self.assertEqual(date_row[0].text, 'Date')
    self.assertEqual(date_row[1].text, '2022-08-30 — 2022-10-24')

    # Check additional charts section
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'svg'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    chart_section = self.driver.find_element(By.ID, 'subject-page-main-pane')
    charts = chart_section.find_elements(By.CLASS_NAME, 'chart-container')
    # assert there are 5+ charts
    self.assertGreater(len(charts), 5)
    # assert that the first chart has data
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 1)

  def test_page_drought(self):
    """Test a drought event page can be loaded successfully"""

    # Load event page for cyclone Nicole.
    self.driver.get(self.url_ + BASE_PAGE_URL + DROUGHT_EVENT_DCID)

    # Assert 200 HTTP code: successful page load.
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains(
            'DroughtEvent at LatLong(10.00000:8.00000) on 2023-01 - Event Page - Data Commons'
        ))

    # Check header section
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    title = self.driver.find_element(By.XPATH,
                                     '//*[@id="main-pane"]/div[1]/div[1]/h1')
    self.assertEqual(title.text,
                     'DroughtEvent at LatLong(10.00000:8.00000) on 2023-01')
    dcid_subtitle = self.driver.find_element(
        By.XPATH, '//*[@id="main-pane"]/div[1]/div[1]/h3')
    self.assertEqual(dcid_subtitle.text, 'Drought Event in Nigeria, Earth')

    # Check google map section
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'map-container'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    iframe_list = self.driver.find_elements(By.TAG_NAME, 'iframe')
    # assert there is 1 iframe
    self.assertEqual(len(iframe_list), 1)

    # Check property values table
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="main-pane"]/div[1]/section/div/table'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    table = self.driver.find_element(
        By.XPATH, '//*[@id="main-pane"]/div[1]/section/div/table')
    table_rows = table.find_elements(
        By.XPATH, '//*[@id="main-pane"]/div[1]/section/div/table/tbody/tr')
    # assert there are 3+ rows in the property values table
    self.assertGreater(len(table_rows), 2)
    date_row = table.find_elements(
        By.XPATH,
        '//*[@id="main-pane"]/div[1]/section/div/table/tbody/tr[2]/td')
    # assert the date is correct
    self.assertEqual(date_row[0].text, 'Date')
    self.assertEqual(date_row[1].text, '2023-01 — 2023-01')

    # Check additional charts section
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'svg'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    chart_section = self.driver.find_element(By.ID, 'subject-page-main-pane')
    charts = chart_section.find_elements(By.CLASS_NAME, 'chart-container')
    # assert there are 11+ charts
    self.assertGreater(len(charts), 11)
    # assert that the first chart has data
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertEqual(len(chart_lines), 1)
