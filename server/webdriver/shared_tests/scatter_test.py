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
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_elem
import server.webdriver.shared as shared

SCATTER_URL = '/tools/scatter'
URL_HASH_1 = '#&svx=Median_Income_Person&svpx=0-3&svnx=Median_income&svy='\
    'Count_Person_AsianAlone&svpy=0-14-1&svdy=Count_Person&svny=Asian_Alone&pcy=1'\
    '&epd=geoId/06&epn=California&ept=County'
PLACE_SEARCH_CA = 'California'


class ScatterTestMixin():
  """Mixins to test the scatter page."""

  def test_server_and_page(self):
    """Test the server can run successfully."""
    title_text = "Scatter Plot Explorer - " + self.dc_title_string
    self.driver.get(self.url_ + SCATTER_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/scatter.js'), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

  def test_charts_from_url(self):
    """Given the url directly, test the page shows up correctly"""
    # Load Scatter Tool page with Statistical Variables.
    self.driver.get(self.url_ + SCATTER_URL + URL_HASH_1)

    # Wait until the chart has loaded.
    shared.wait_for_loading(self.driver)
    scatterplot = find_elem(self.driver, by=By.ID, value='scatterplot')
    self.assertIsNotNone(scatterplot)

    # Assert place name is correct.
    self.assertEqual(
        find_elem(self.driver,
                  by=By.XPATH,
                  value='//*[@id="place-list"]/div/span').text, 'California')

    # Assert chart is correct.
    chart = find_elem(self.driver,
                      by=By.XPATH,
                      value='//*[@id="chart"]/div[1]/div[1]')
    self.assertIn("Population Asian Alone Per Capita ",
                  find_elem(chart, by=By.XPATH, value='./h3[1]').text)
    self.assertIn("Median Income of a Population ",
                  find_elem(chart, by=By.XPATH, value='./h3[2]').text)
    circles = find_elems(scatterplot, by=By.TAG_NAME, value='circle')
    self.assertGreater(len(circles), 20)

  def test_manually_enter_options(self):
    """Test entering place and stat var options manually will cause chart to
    show up.
    """
    self.driver.get(self.url_ + SCATTER_URL)

    # Wait until search box is present and type california into the search box
    search_box_input = find_elem(self.driver, by=By.ID, value='ac')
    search_box_input.send_keys(PLACE_SEARCH_CA)

    # Wait until there is at least one result in autocomplete results.
    self.assertIsNotNone(wait_elem(self.driver, value='pac-item'))

    # Click on the first result.
    find_elem(self.driver, by=By.CSS_SELECTOR,
              value='.pac-item:nth-child(1)').click()
    shared.wait_for_loading(self.driver)
    self.assertIsNotNone(wait_elem(self.driver, value='place-selector-place-type'))

    # Choose place type
    Select(
        find_elem(self.driver, by=By.ID,
                  value='place-selector-place-type')).select_by_value('County')

    # Choose stat vars
    shared.wait_for_loading(self.driver)
    shared.click_sv_group(self.driver, "Demographics")

    # Click on median age button
    shared.wait_for_loading(self.driver)
    element_present = EC.presence_of_element_located(
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    find_elem(
        self.driver,
        by=By.ID,
        value='Median_Age_Persondc/g/Demographics-Median_Age_Person').click()

    # Click on median income button
    shared.wait_for_loading(self.driver)
    find_elem(self.driver,
              by=By.ID,
              value='Median_Income_Persondc/g/Demographics-Median_Income_Person'
             ).click()

    # Assert chart is correct.
    scatterplot = find_elem(self.driver, by=By.ID, value='scatterplot')
    chart = find_elem(self.driver,
                      by=By.XPATH,
                      value='//*[@id="chart"]/div[1]/div[1]')
    self.assertIn("Median Income of a Population ",
                  find_elem(chart, by=By.XPATH, value='./h3[1]').text)
    self.assertIn("Median Age of Population ",
                  find_elem(chart, by=By.XPATH, value='./h3[2]').text)
    circles = find_elems(scatterplot, by=By.TAG_NAME, value='circle')
    self.assertGreater(len(circles), 20)

  def test_landing_page_link(self):
    self.driver.get(self.url_ + SCATTER_URL)

    # Click on first link on landing page
    shared.wait_for_loading(self.driver)
    find_elem(self.driver,
              by=By.XPATH,
              value='//*[@id="placeholder-container"]/ul/li[1]/a[1]').click()

    # Assert chart loads
    shared.wait_for_loading(self.driver)
    chart = find_elem(self.driver, by=By.ID, value='scatterplot')
    circles = find_elems(chart, by=By.TAG_NAME, value='circle')
    self.assertGreater(len(circles), 1)
