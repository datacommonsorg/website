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

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.shared_tests.homepage_test import HomepageTestMixin


class TestHomepage(HomepageTestMixin, BaseDcWebdriverTest):
  """Tests for Homepage. Some tests come from HomepageTestMixin."""

  def test_homepage_en_by_css(self):
    """Test homepage in EN."""

    self.driver.get(self.url_ + '/')

    # Assert page title is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains(self.dc_title_string))

    self.assertTrue(
        find_elem(self.driver, by=By.ID, value='hero').text.startswith(
            "Data Commons brings together the world's public data, making it simple to explore"
        ))

  def test_homepage_it(self):
    """Test homepage in IT."""

    self.driver.get(self.url_ + '/?hl=it')

    # Assert page title is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains(self.dc_title_string))

    self.assertTrue(
        find_elem(self.driver, by=By.ID, value='hero').text.startswith(
            "Data Commons brings together the world's public data, making it simple to explore"
        ))

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
  def test_homepage_autocomplete_places(self):
    """Test homepage autocomplete for places."""

    self.driver.get(self.url_ +
                    '/?ac_on=true&enable_feature=enable_stat_var_autocomplete')

    # Assert page title is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains(self.dc_title_string))

    search_box_input = find_elem(self.driver,
                                 by=By.ID,
                                 value='query-search-input')

    # Test simple place search
    search_box_input.send_keys("California")
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[data-testid='search-input-result-section']")))
    results = find_elems(self.driver,
                         by=By.CSS_SELECTOR,
                         value="[data-testid='search-input-result-section']")
    self.assertGreater(len(results), 0)
    search_box_input.clear()

    # Test complex query with place at the end
    search_box_input.send_keys("Population of Calif")
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[data-testid='search-input-result-section']")))
    first_result = find_elem(
        self.driver,
        by=By.CSS_SELECTOR,
        value="[data-testid='search-input-result-section']")
    self.assertIn("California", first_result.text)
    search_box_input.clear()

  def test_homepage_autocomplete_statvars(self):
    """Test homepage autocomplete for stat vars."""

    self.driver.get(self.url_ +
                    '/?ac_on=true&enable_feature=enable_stat_var_autocomplete')

    # Assert page title is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains(self.dc_title_string))

    search_box_input = find_elem(self.driver,
                                 by=By.ID,
                                 value='query-search-input')

    # Test autocomplete for stat vars
    search_box_input.send_keys("gdp")
    # Wait for the results to appear before counting
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[data-testid='search-input-result-section']")))
    initial_results = find_elems(
        self.driver,
        by=By.CSS_SELECTOR,
        value="[data-testid='search-input-result-section']")
    # We are now only counting actual search results (and not the load more)
    self.assertEqual(len(initial_results), 4)
    search_box_input.clear()
    # Sleeping this way is not ideal.
    # However, without it, it does not always clear the search box,
    # and the call below ends up searching for "gdpHousehold Income".
    # The sleep gives it time to clear and deflakes the test.
    time.sleep(1)

    # Test load more stat var results
    search_box_input.send_keys("Household Income")
    # Wait for the results to appear before counting
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[data-testid='search-input-result-section']")))
    initial_results = find_elems(
        self.driver,
        by=By.CSS_SELECTOR,
        value="[data-testid='search-input-result-section']")
    # We are now only counting actual search results (and not the load more)
    self.assertEqual(len(initial_results), 4)

    # Click on the "Load More" button to fetch more results
    load_more_button = find_elem(self.driver,
                                 by=By.CLASS_NAME,
                                 value='load-more-section')
    self.assertIsNotNone(load_more_button)
    initial_count = len(initial_results)
    load_more_button.click()

    # Wait for new results to load, which means more result sections appear
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(lambda d: len(
        find_elems(d,
                   by=By.CSS_SELECTOR,
                   value="[data-testid='search-input-result-section']")) >
                                                       initial_count)
    final_results = find_elems(
        self.driver,
        by=By.CSS_SELECTOR,
        value="[data-testid='search-input-result-section']")
    self.assertGreater(len(final_results), initial_count)