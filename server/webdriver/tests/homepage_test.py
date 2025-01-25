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
  def test_homepage_autocomplete(self):
    """Test homepage autocomplete."""

    self.driver.get(self.url_ + '/?ac_on=true')

    # Assert page title is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains(self.dc_title_string))

    # Type california into the search box.
    search_box_input = find_elem(self.driver,
                                 by=By.ID,
                                 value='query-search-input')
    search_box_input.send_keys("California")

    self.assertEqual(
        len(find_elems(self.driver, value='search-input-result-section')), 5)
