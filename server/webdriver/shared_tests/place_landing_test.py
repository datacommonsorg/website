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


class PlaceLandingTestMixin():
  """Mixins to test the place landing page."""

  def test_place_landing_en(self):
    """Test place landing page in EN."""

    self.driver.get(self.url_ + '/place')

    subtitle_present = EC.text_to_be_present_in_element((By.TAG_NAME, 'h1'),
                                                        'Place Explorer')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subtitle_present)

    intro = self.driver.find_element(By.XPATH, '//*[@id="body"]/p[1]')
    self.assertTrue(
        intro.text.startswith('The Place Explorer tool helps you understand'))

    chicago = self.driver.find_element(By.XPATH,
                                       '//*[@id="body"]/ul[1]/li[1]/a[1]')
    self.assertEqual(chicago.text, 'Chicago, IL')

    kentucky = self.driver.find_element(By.XPATH,
                                        '//*[@id="body"]/ul[1]/li[3]/a[4]')
    self.assertEqual(kentucky.text, 'Kentucky')
    self.assertEqual(kentucky.get_attribute('href'),
                     self.url_ + '/place/geoId/21')

    median_income = self.driver.find_element(
        By.XPATH, '//*[@id="body"]/ul[2]/li[1]/strong')
    self.assertEqual(median_income.text, 'Median Income, United States')

    gni = self.driver.find_element(By.XPATH, '//*[@id="body"]/ul[2]/li[4]/a[2]')
    self.assertEqual(gni.text, 'Gross National Income')
    self.assertEqual(
        gni.get_attribute('href'), self.url_ +
        '/ranking/Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity_PerCapita/Country/'
    )

    map_search = self.driver.find_element(By.XPATH,
                                          '//*[@id="place-autocomplete"]')
    self.assertEqual(map_search.get_attribute('placeholder'),
                     'Enter a country, state, county or city')

  def test_place_landing_ru(self):
    """Test place landing page in RU."""

    self.driver.get(self.url_ + '/place?hl=ru')

    subtitle_present = EC.text_to_be_present_in_element((By.TAG_NAME, 'h1'),
                                                        'Place Explorer')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subtitle_present)

    intro = self.driver.find_element(By.XPATH, '//*[@id="body"]/p[1]')
    self.assertTrue(
        intro.text.startswith(
            'Place Explorer – это инструмент, который помогает'))

    chicago = self.driver.find_element(By.XPATH,
                                       '//*[@id="body"]/ul[1]/li[1]/a[1]')
    self.assertEqual(chicago.text, 'Чикаго, Иллинойс')

    kentucky = self.driver.find_element(By.XPATH,
                                        '//*[@id="body"]/ul[1]/li[3]/a[4]')
    self.assertEqual(kentucky.text, 'Кентукки')
    self.assertEqual(kentucky.get_attribute('href'),
                     self.url_ + '/place/geoId/21?hl=ru')

    median_income = self.driver.find_element(
        By.XPATH, '//*[@id="body"]/ul[2]/li[1]/strong')
    self.assertEqual(median_income.text, 'Медианный доход в США')

    gni = self.driver.find_element(By.XPATH, '//*[@id="body"]/ul[2]/li[4]/a[2]')
    self.assertEqual(gni.text, 'Валовой национальный доход')
    self.assertEqual(
        gni.get_attribute('href'), self.url_ +
        '/ranking/Amount_EconomicActivity_GrossNationalIncome_PurchasingPowerParity_PerCapita/Country/?hl=ru'
    )

    map_search = self.driver.find_element(By.XPATH,
                                          '//*[@id="place-autocomplete"]')
    self.assertEqual(map_search.get_attribute('placeholder'),
                     'Укажите страну, штат, округ или город')
