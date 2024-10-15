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


class PlaceI18nExplorerTestMixin():
  """Mixins to test the i18n place explorer page."""

  def test_japan_in_japanese(self):
    """Test translations from various sources are displayed correctly."""

    start_url = self.url_ + '/place/country/JPN?hl=ja'
    self.driver.get(start_url)

    place_name_present = EC.text_to_be_present_in_element((By.ID, 'place-name'),
                                                          '日本')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(place_name_present)

    place_type_present = EC.text_to_be_present_in_element((By.ID, 'place-type'),
                                                          'アジア 内の 国')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(place_type_present)

    economics_section_present = EC.text_to_be_present_in_element(
        (By.ID, 'Economics'), '経済')
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(economics_section_present)

    # TODO(beets): Re-enable this test after fixing flakiness in finding
    # the chart.
    # Test strings in GDP comparison chart
    gdp_chart = self.driver.find_element(
        By.XPATH, '//*[@id="main-pane"]/section[1]/div/div[1]/div')
    self.assertEqual(
        gdp_chart.find_element(By.XPATH, 'h4').text, '日本 の 1 人あたりの国内総生産')

    # Test that chart tick values are translated
    y_text = gdp_chart.find_elements(By.CLASS_NAME,
                                     'y')[0].find_elements(By.TAG_NAME, 'text')
    self.assertEqual(y_text[0].text, 'USD 0')
    self.assertEqual(y_text[1].text, 'USD 1万')

    x_text = gdp_chart.find_elements(By.CLASS_NAME,
                                     'x')[0].find_elements(By.TAG_NAME, 'text')
    self.assertEqual(x_text[0].text, '1960')

    # Test that sv labels are translated
    sv_legend = gdp_chart.find_elements(By.CLASS_NAME, 'legend-basic')[0]
    sv_label = sv_legend.find_elements(By.TAG_NAME, 'a')[0]
    self.assertEqual(sv_label.text, '1 人あたりの GDP')

    # Test that topics are translated
    health_topic = self.driver.find_element(By.XPATH,
                                            '//*[@id="nav-topics"]/li[3]/a')
    self.assertEqual(health_topic.text, '健康')

    # Test strings in descendent place component
    descendent_places = self.driver.find_element(By.XPATH,
                                                 '//*[@id="child-place-head"]')
    self.assertEqual(descendent_places.text, '日本 の地域')
    aa_children_label = self.driver.find_element(
        By.XPATH, '//*[@id="child-place"]/div/div')
    self.assertEqual(aa_children_label.text, '行政区域 1 の地域')
    aichi_prefecture = self.driver.find_element(
        By.XPATH, '//*[@id="child-place"]/div/a[1]')
    self.assertEqual(aichi_prefecture.text, '三重県,')

    # Test that timeline links are removed
    self.assertListEqual(
        self.driver.find_elements(By.CLASS_NAME, 'explore-more'), [])

  def test_demographics_link_in_fr(self):
    """Test the demographics link in FR propagates."""

    # Load France page.
    self.driver.get(self.url_ + '/place/country/FRA?hl=fr')

    # Wait until the Demographics link is present.
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="Demographics"]/a'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Find and click on the Demographics URL.
    demographics = self.driver.find_element(By.XPATH,
                                            '//*[@id="Demographics"]/a')
    self.assertEqual(demographics.text, 'DONNÉES DÉMOGRAPHIQUES')
    demographics.click()

    # Wait until the new page has loaded.
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="main-pane"]/section[4]/div/div[2]/div/h4'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Assert that Demographics and hl=fr is part of the new url.
    self.assertTrue("Demographics" in self.driver.current_url)
    self.assertTrue("&hl=fr" in self.driver.current_url)

    # Assert chart title is correct.
    chart_title = self.driver.find_element(
        By.XPATH, '//*[@id="main-pane"]/section[5]/div/div[2]/div/h4')
    self.assertEqual(chart_title.text,
                     'Population urbaine et rurale : autres pays(2022)')

    # Click through to ranking
    pop_growth_rate_chip = self.driver.find_element(
        By.XPATH,
        '//*[@id="main-pane"]/section[6]/div/div[1]/div/div/div/div/a')
    self.assertEqual(pop_growth_rate_chip.text,
                     'Taux de croissance de la population')
    pop_growth_rate_chip.click()

    # Wait until ranking page has loaded
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'h1'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Assert language is propagated
    url = self.driver.current_url
    self.assertTrue('GrowthRate_Count_Person' in url)
    self.assertTrue('Country' in url)
    self.assertTrue('europe' in url)
    self.assertTrue('unit=%25' in url)
    self.assertTrue('hl=fr' in url)
    self.assertEqual(
        self.driver.find_element(By.TAG_NAME, 'h1').text,
        'Classement par Taux de croissance de la population')
