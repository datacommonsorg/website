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
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.shared_tests.homepage_test import HomepageTestMixin
from server.webdriver.base import WebdriverBaseTest

# Class to test the browser page
class TestPlaceLanding(HomepageTestMixin, WebdriverBaseTest):
  """Tests for Homepage."""
  DATACOMMONS_STRING = "Data Commons"

  def test_homepage_en_by_css(self):
    """Test homepage in EN."""

    self.driver.get(self.url_ + '/')

    title_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-nav .navbar-brand'), 'Data Commons')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    hero_msg = self.driver.find_elements(By.ID, 'hero')[0]
    self.assertTrue(
        hero_msg.text.startswith(
            'Data Commons aggregates and harmonizes global, open data'))

  def test_homepage_it(self):
    """Test homepage in IT."""

    self.driver.get(self.url_ + '/?hl=it')

    title_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-nav .navbar-brand'), 'Data Commons')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    hero_msg = self.driver.find_elements(By.ID, 'hero')[0]
    self.assertTrue(
        hero_msg.text.startswith(
            'Data Commons aggregates and harmonizes global, open data'))

  # def test_hero_all_langs(self):
  #   """Test hero message translation in *all* languages.

  #   NOTE: EN and IT are tested in other tests in this module.
  #   """

  #   self.driver.get(self.url_ + '/?hl=de')
  #   hero_msg = self.driver.find_elements(By.CLASS_NAME, 'lead')[0]
  #   self.assertTrue(
  #       hero_msg.text.startswith(
  #           'Data Commons ist ein Open Knowledge Repository'))

  #   self.driver.get(self.url_ + '/?hl=es')
  #   hero_msg = self.driver.find_elements(By.CLASS_NAME, 'lead')[0]
  #   self.assertTrue(
  #       hero_msg.text.startswith('Data Commons es un repositorio abierto'))

  #   self.driver.get(self.url_ + '/?hl=fr')
  #   hero_msg = self.driver.find_elements(By.CLASS_NAME, 'lead')[0]
  #   self.assertTrue(
  #       hero_msg.text.startswith('Data Commons est un dépôt de connaissances'))

  #   self.driver.get(self.url_ + '/?hl=hi')
  #   hero_msg = self.driver.find_elements(By.CLASS_NAME, 'lead')[0]
  #   self.assertTrue(
  #       hero_msg.text.startswith(
  #           'Data Commons, एक ऐसा प्रोजेक्ट है जिसमें डेटा'))

  #   self.driver.get(self.url_ + '/?hl=ja')
  #   hero_msg = self.driver.find_elements(By.CLASS_NAME, 'lead')[0]
  #   self.assertTrue(hero_msg.text.startswith('データコモンズは、マッピングされた共通'))

  #   self.driver.get(self.url_ + '/?hl=ko')
  #   hero_msg = self.driver.find_elements(By.CLASS_NAME, 'lead')[0]
  #   self.assertTrue(hero_msg.text.startswith('Data Commons는 매핑된 공통 항목을 사용해'))

  #   self.driver.get(self.url_ + '/?hl=ru')
  #   hero_msg = self.driver.find_elements(By.CLASS_NAME, 'lead')[0]
  #   self.assertTrue(
  #       hero_msg.text.startswith('Data Commons – это открытая база данных'))


  # Tests for NL Search Bar AutoComplete feature.
  def test_homepage_autocomplete(self):
    """Test homepage autocomplete."""

    self.driver.get(self.url_ + '/?ac_on=true')

    title_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-nav .navbar-brand'), self.DATACOMMONS_STRING)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    search_box_input = self.driver.find_element(By.ID, 'query-search-input')

    # Type california into the search box.
    search_box_input.send_keys("California")

    suggestions_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'search-input-result-section'))
    WebDriverWait(self.driver, 300).until(suggestions_present)

    autocomplete_results = self.driver.find_elements(
        By.CLASS_NAME, 'search-input-result-section')
    self.assertTrue(len(autocomplete_results) == 5)
