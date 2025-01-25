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

from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems


class RankingTestMixin():
  """Mixins to test the ranking page."""

  def test_northamerica_population(self):
    """Test basic ranking page."""

    self.driver.get(self.url_ + '/ranking/Count_Person/Country/northamerica')

    subtitle_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-pane h3'), 'All Countries in North America')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subtitle_present)

    self.assertEqual(
        find_elem(self.driver, by=By.TAG_NAME, value='h1').text,
        'Ranking by Population')

    table = find_elem(self.driver,
                      by=By.XPATH,
                      value='//*[@id="main-pane"]/div/table')
    headers = find_elems(table, by=By.XPATH, value='.//thead/tr/th')
    self.assertEqual([headers[i].text for i in range(0, 3)],
                     ['Rank', 'Country', 'Value'])

    row = find_elems(table, by=By.XPATH, value='.//tbody/tr[1]/td')
    self.assertEqual([row[i].text for i in range(0, 2)],
                     ['1', 'United States of America'])

    chart = find_elem(self.driver, value='chart-container')
    y_text = find_elems(find_elem(chart, value='y'),
                        by=By.TAG_NAME,
                        value='text')
    self.assertEqual([y_text[i].text for i in range(-1, 1)], ['300M', '0'])

    x_text = find_elems(find_elem(chart, value='x'),
                        by=By.TAG_NAME,
                        value='text')
    self.assertEqual([x_text[i].text for i in range(-1, 1)],
                     ['Montserrat', 'United States of America'])

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
        find_elem(self.driver, by=By.TAG_NAME, value='h1').text,
        'जनसंख्या के हिसाब से रैंकिंग')
    self.assertEqual(
        find_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="main-pane"]/div/h3/a').get_attribute('href'),
        self.url_ + '/ranking/Count_Person/Country/?h=country%2FIND&hl=hi')

    table = find_elem(self.driver,
                      by=By.XPATH,
                      value='//*[@id="main-pane"]/div/table')
    headers = find_elems(table, by=By.XPATH, value='.//thead/tr/th')
    self.assertEqual([headers[i].text for i in range(0, 3)],
                     ['रैंक', 'देश', 'मान'])
    self.assertGreater(len(find_elems(table, by=By.XPATH, value='.//tbody/tr')),
                       0)

  def test_population_top_ranking_ko(self):
    """Test translations are displayed correctly in korean, as well as top rankings rendered correctly."""
    self.driver.get(self.url_ +
                    '/ranking/Count_Person/Country/?h=country%2FKOR&hl=ko')

    title_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '.navbar-brand'), self.dc_title_string)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(title_present)

    subtitle_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '#main-pane h3'), 'the World 상위 국가 100개')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subtitle_present)
    self.assertEqual(
        find_elem(self.driver, by=By.TAG_NAME, value='h1').text, '인구 순위')
    self.assertEqual(
        find_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="main-pane"]/div/h3/a').get_attribute('href'),
        self.url_ +
        '/ranking/Count_Person/Country/?h=country%2FKOR&hl=ko&bottom=')

    table = find_elem(self.driver,
                      by=By.XPATH,
                      value='//*[@id="main-pane"]/div/table')
    headers = find_elems(table, by=By.XPATH, value='.//thead/tr/th')
    self.assertEqual([headers[i].text for i in range(0, 3)], ['순위', '국가', '값'])
    self.assertGreater(len(find_elems(table, by=By.XPATH, value='.//tbody/tr')),
                       0)

    chart = find_elem(self.driver, value='chart-container')
    y_text = find_elems(find_elem(chart, value='y'),
                        by=By.TAG_NAME,
                        value='text')
    self.assertGreater(len(y_text), 1)
    self.assertEqual(y_text[0].text, '0')
