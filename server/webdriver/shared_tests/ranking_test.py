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

  def test_population_bottom_ranking_hi(self):
    """Test translations are displayed correctly in hindi, as well as bottom rankings rendered correctly."""
    self.driver.get(
        self.url_ +
        '/ranking/Count_Person/Country/?h=country%2FIND&hl=hi&bottom=')

    title_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '.navbar-brand'), self.dc_title_string)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    subtitle_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-pane h3'), 'the World से नीचे से 100 देश')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subtitle_present)
    self.assertEqual(
        self.driver.find_element(By.TAG_NAME, 'h1').text,
        'जनसंख्या के हिसाब से रैंकिंग')
    self.assertEqual(
        self.driver.find_element(
            By.XPATH, '//*[@id="main-pane"]/div/h3/a').get_attribute('href'),
        self.url_ +
        '/ranking/Count_Person/Country/?h=country%2FIND&hl=hi')

    table = self.driver.find_element(By.XPATH, '//*[@id="main-pane"]/div/table')
    headers = table.find_elements(By.XPATH, './/thead/tr/th')
    self.assertEqual(headers[0].text, 'रैंक')
    self.assertEqual(headers[1].text, 'देश')
    self.assertEqual(headers[2].text, 'किलोग्राम')
    rows = table.find_elements(By.XPATH, './/tbody/tr')
    self.assertGreater(len(rows), 0)

  def test_population_top_ranking_ko(self):
    """Test translations are displayed correctly in korean, as well as top rankings rendered correctly."""
    self.driver.get(
        self.url_ +
        '/ranking/Count_Person/Country/?h=country%2FKOR&hl=ko')

    title_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '.navbar-brand'), self.dc_title_string)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    subtitle_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-pane h3'), 'the World 상위 국가 100개')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subtitle_present)
    self.assertEqual(self.driver.find_element(By.TAG_NAME, 'h1').text, '인구 순위')
    self.assertEqual(
        self.driver.find_element(
            By.XPATH, '//*[@id="main-pane"]/div/h3/a').get_attribute('href'),
        self.url_ +
        '/ranking/Count_Person/Country/?h=country%2FKOR&hl=ko&bottom=')

    table = self.driver.find_element(By.XPATH, '//*[@id="main-pane"]/div/table')
    headers = table.find_elements(By.XPATH, './/thead/tr/th')
    self.assertEqual(headers[0].text, '순위')
    self.assertEqual(headers[1].text, '국가')
    self.assertEqual(headers[2].text, '킬로그램')
    rows = table.find_elements(By.XPATH, './/tbody/tr')
    self.assertGreater(len(rows), 0)

    chart = self.driver.find_element(By.CLASS_NAME, 'chart-container')
    y_text = chart.find_elements(By.CLASS_NAME,
                                 'y')[0].find_elements(By.TAG_NAME, 'text')
    self.assertEqual(y_text[0].text, '0kg')
    self.assertEqual(y_text[-1].text, '12억kg')
