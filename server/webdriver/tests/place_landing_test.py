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

from server.webdriver.base import WebdriverBaseTest


class TestPlaceLanding(WebdriverBaseTest):
  """Tests for Place Landing page."""

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

  def test_place_landing_explore_more(self):
    """Test place landing explore more link."""

    self.driver.get(self.url_ + '/place/geoId/1714000?category=Education')

    # Wait until the chart has loaded.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'chart-container'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    explore_more = self.driver.find_element(
        By.XPATH,
        '//*[@id="main-pane"]/section[1]/div/div[2]/div/footer/div[2]/a[2]')
    self.assertEqual(explore_more.text, 'Explore More ›')

    explore_more.click()

    # Wait for the new page to open in a new tab
    new_page_opened = EC.number_of_windows_to_be(2)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(new_page_opened)

    # Switch tabs to the page for the timeline tool
    new_page = self.driver.window_handles[-1]
    self.driver.switch_to.window(new_page)

    # Assert timelines page loaded
    NEW_PAGE_TITLE = 'Timelines Explorer - Data Commons'
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(NEW_PAGE_TITLE))

    # Wait until the group of charts has loaded.
    element_present = EC.presence_of_element_located((By.ID, 'chart-region'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Store a list of all the charts.
    chart_region = self.driver.find_element(By.XPATH, '//*[@id="chart-region"]')
    charts = chart_region.find_elements(By.CLASS_NAME, 'card')
    # Assert there are three charts.
    self.assertEqual(len(charts), 1)
    # Wait until the charts are drawn.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'legend-text'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    # Assert first chart has 36 lines (ie. has data)
    chart_lines = charts[0].find_elements(By.CLASS_NAME, 'line')
    self.assertGreater(len(chart_lines), 10)

  def test_place_landing_url_param(self):
    """Test place landing url parameters."""

    # Test for ?category=Education
    self.driver.get(self.url_ + '/place/geoId/1714000?category=Education')
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'chart-container'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    link = self.driver.find_element(
        By.XPATH, '//*[@id="nav-topics"]/li[6]/ul/div/li[1]/a')
    self.assertEqual(link.text, 'Education attainment')

    # Test for ?topic=Education
    self.driver.get(self.url_ + '/place/geoId/1714000?topic=Education')
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'chart-container'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    link = self.driver.find_element(
        By.XPATH, '//*[@id="nav-topics"]/li[6]/ul/div/li[1]/a')
    self.assertEqual(link.text, 'Education attainment')
