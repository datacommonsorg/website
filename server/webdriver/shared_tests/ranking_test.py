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


class RankingTestMixin():
  """Mixins to test the ranking page."""

  def test_northamerica_population(self):
    """Test basic ranking page."""

    self.driver.get(self.url_ + '/ranking/Count_Person/Country/northamerica')

    subtitle_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-pane h3'), 'All Countries in North America')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subtitle_present)

    self.assertEqual(
        self.driver.find_element(By.TAG_NAME, 'h1').text,
        'Ranking by Population')

    table = self.driver.find_element(By.XPATH, '//*[@id="main-pane"]/div/table')
    headers = table.find_elements(By.XPATH, './/thead/tr/th')
    self.assertEqual(headers[0].text, 'Rank')
    self.assertEqual(headers[1].text, 'Country')
    self.assertEqual(headers[2].text, 'Value')
    row = table.find_elements(By.XPATH, './/tbody/tr[1]/td')
    self.assertEqual(row[0].text, '1')
    self.assertEqual(row[1].text, 'United States of America')

    chart = self.driver.find_element(By.CLASS_NAME, 'chart-container')
    y_text = chart.find_elements(By.CLASS_NAME,
                                 'y')[0].find_elements(By.TAG_NAME, 'text')
    self.assertEqual(y_text[0].text, '0')
    self.assertEqual(y_text[-1].text, '300M')

    x_text = chart.find_elements(By.CLASS_NAME,
                                 'x')[0].find_elements(By.TAG_NAME, 'text')
    self.assertEqual(x_text[0].text, 'United States of America')
    self.assertEqual(x_text[-1].text, 'Montserrat')

  def test_energy_consumption_bottom_ranking_hi(self):
    """Test translations are displayed correctly in hindi, as well as bottom rankings rendered correctly."""
    self.driver.get(
        self.url_ +
        '/ranking/Amount_Consumption_Energy_PerCapita/Country/?h=country%2FIND&unit=kg&hl=hi&bottom='
    )

    title_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-nav .navbar-brand'), self.dc_title_string)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    subtitle_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-pane h3'), 'the World से नीचे से 100 देश')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subtitle_present)
    self.assertEqual(
        self.driver.find_element(By.TAG_NAME, 'h1').text,
        'प्रति व्यक्ति ऊर्जा की खपत के हिसाब से रैंकिंग')
    self.assertEqual(
        self.driver.find_element(
            By.XPATH,
            '//*[@id="main-pane"]/div/h3/a').get_attribute('href'), self.url_ +
        '/ranking/Amount_Consumption_Energy_PerCapita/Country/?h=country%2FIND&unit=kg&hl=hi'
    )

    table = self.driver.find_element(By.XPATH, '//*[@id="main-pane"]/div/table')
    headers = table.find_elements(By.XPATH, './/thead/tr/th')
    self.assertEqual(headers[0].text, 'रैंक')
    self.assertEqual(headers[1].text, 'देश')
    self.assertEqual(headers[2].text, 'किलोग्राम')
    row = table.find_elements(By.XPATH, './/tbody/tr[1]/td')
    self.assertEqual(row[0].text, '172')
    self.assertEqual(row[1].text, 'लेसोथो')
    self.assertEqual(
        row[1].find_element(By.TAG_NAME, 'a').get_attribute('href'),
        self.url_ + '/place/country/LSO?hl=hi')

    chart = self.driver.find_element(By.CLASS_NAME, 'chart-container')
    y_text = chart.find_elements(By.CLASS_NAME,
                                 'y')[0].find_elements(By.TAG_NAME, 'text')
    self.assertEqual(y_text[0].text, '0 कि॰ग्रा॰')
    self.assertEqual(y_text[-1].text, '1.5 हज़ार कि॰ग्रा॰')

    x_text = chart.find_elements(By.CLASS_NAME,
                                 'x')[0].find_elements(By.TAG_NAME, 'text')
    self.assertEqual(x_text[0].text, 'साइप्रस')
    self.assertEqual(x_text[-1].text, 'लेसोथो')

  def test_energy_consumption_top_ranking_ko(self):
    """Test translations are displayed correctly in korean, as well as top rankings rendered correctly."""
    self.driver.get(
        self.url_ +
        '/ranking/Amount_Consumption_Energy_PerCapita/Country/?h=country%2FKOR&unit=kg&hl=ko'
    )

    title_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-nav .navbar-brand'), self.dc_title_string)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    subtitle_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-pane h3'), 'the World 상위 국가 100개')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subtitle_present)
    self.assertEqual(
        self.driver.find_element(By.TAG_NAME, 'h1').text, '1인당 에너지 소비량 순위')
    self.assertEqual(
        self.driver.find_element(
            By.XPATH,
            '//*[@id="main-pane"]/div/h3/a').get_attribute('href'), self.url_ +
        '/ranking/Amount_Consumption_Energy_PerCapita/Country/?h=country%2FKOR&unit=kg&hl=ko&bottom='
    )

    table = self.driver.find_element(By.XPATH, '//*[@id="main-pane"]/div/table')
    headers = table.find_elements(By.XPATH, './/thead/tr/th')
    self.assertEqual(headers[0].text, '순위')
    self.assertEqual(headers[1].text, '국가')
    self.assertEqual(headers[2].text, '킬로그램')
    row = table.find_elements(By.XPATH, './/tbody/tr[1]/td')
    self.assertEqual(row[0].text, '1')
    self.assertEqual(row[1].text, '카타르')
    self.assertEqual(
        row[1].find_element(By.TAG_NAME, 'a').get_attribute('href'),
        self.url_ + '/place/country/QAT?hl=ko')

    chart = self.driver.find_element(By.CLASS_NAME, 'chart-container')
    y_text = chart.find_elements(By.CLASS_NAME,
                                 'y')[0].find_elements(By.TAG_NAME, 'text')
    self.assertEqual(y_text[0].text, '0kg')
    self.assertEqual(y_text[-1].text, '1.5만kg')

    x_text = chart.find_elements(By.CLASS_NAME,
                                 'x')[0].find_elements(By.TAG_NAME, 'text')
    self.assertEqual(x_text[0].text, '카타르')
    self.assertEqual(x_text[-1].text, '에콰도르')
