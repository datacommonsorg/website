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

import urllib
import urllib.request

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared

SCATTER_URL = '/tools/visualization#visType=scatter'
URL_HASH_1 = '&place=geoId/06&placeType=County&sv=%7B"dcid"%3A"Count_Person_NoHealthInsurance"%7D___%7B"dcid"%3A"Count_Person_Female"%7D'
PLACE_SEARCH_CA = 'California'


class VisScatterTestMixin():
  """Mixins to test the scatter visualization page."""

  def test_server_and_page(self):
    """Test the server can run successfully."""
    self.driver.get(self.url_ + SCATTER_URL)

    # Assert 200 HTTP code: successful page load.
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert 200 HTTP code: successful JS generation.
    req = urllib.request.Request(self.url_ + '/visualization.js')
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct.
    title_text = "Tools - " + self.dc_title_string
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

    # Wait until the page has loaded.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'visualization-app'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Assert page heading and selected tab are correct.
    page_header = self.driver.find_element(By.CSS_SELECTOR, '.info-content h3')
    self.assertEqual(page_header.text, 'Scatter Plot')
    selected_tab = self.driver.find_element(
        By.CSS_SELECTOR, ".vis-type-selector .selected .label")
    self.assertEqual(selected_tab.text, 'Scatter Plot')

  def test_charts_from_url(self):
    """Given the url directly, test the page shows up correctly"""
    self.driver.get(self.url_ + SCATTER_URL + URL_HASH_1)

    # Wait until the chart has loaded.
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(shared.charts_rendered)

    # Assert place name is correct.
    place_name_chip = self.driver.find_element(
        By.CSS_SELECTOR, '.selected-option-chip.place .chip-content')
    self.assertTrue('California' in place_name_chip.text)

    # Assert place type is correct.
    place_type_chip = self.driver.find_element(
        By.CSS_SELECTOR, '.selected-option-chip.place-type .chip-content')
    self.assertTrue('County' in place_type_chip.text)

    # Assert stat var is correct.
    stat_var_chips = self.driver.find_elements(
        By.CSS_SELECTOR, '.selected-option-chip.stat-var .chip-content')
    self.assertTrue(
        'Population Without Health Insurance' in stat_var_chips[0].text)
    self.assertTrue('Female Population' in stat_var_chips[1].text)

    # Assert chart is correct.
    chart_title = self.driver.find_element(By.CSS_SELECTOR,
                                           '.scatter-chart .chart-headers h4')
    self.assertEqual(
        chart_title.text,
        "Population Without Health Insurance (2022) vs Female Population (2022)"
    )
    chart = self.driver.find_element(By.ID, 'scatterplot')
    circles = chart.find_elements(By.TAG_NAME, 'circle')
    self.assertGreater(len(circles), 20)

    # Click all the chart options and assert results are correct.
    chart_option_inputs = self.driver.find_elements(
        By.CSS_SELECTOR,
        '.chart-footer-options .chart-option .form-check-input')
    for input in chart_option_inputs:
      input.click()
      shared.wait_for_loading(self.driver)
    y_axis_label = self.driver.find_element(By.CSS_SELECTOR,
                                            '#scatterplot .y-axis-label')
    self.assertTrue(
        'Population Without Health Insurance (%)' in y_axis_label.text)
    x_axis_label = self.driver.find_element(By.CSS_SELECTOR,
                                            '#scatterplot .x-axis-label')
    self.assertTrue('Female Population (%)' in x_axis_label.text)
    chart = self.driver.find_element(By.ID, 'scatterplot')
    circles = chart.find_elements(By.TAG_NAME, 'circle')
    self.assertGreater(len(circles), 20)
    quadrant_lines = chart.find_elements(By.CSS_SELECTOR,
                                         '#scatterplot .quadrant-line')
    self.assertEqual(len(quadrant_lines), 2)
    dot_labels = chart.find_element(By.CLASS_NAME, 'dot-label').find_elements(
        By.TAG_NAME, 'text')
    self.assertEqual(len(circles), len(dot_labels))

    # Edit source and assert results are correct.
    edit_source_button = self.driver.find_element(
        By.CLASS_NAME, 'source-selector-open-modal-button')
    edit_source_button.click()
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'modal-body'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    source_option_sections = self.driver.find_elements(
        By.CLASS_NAME, 'source-selector-options-section')
    self.assertEqual(len(source_option_sections), 2)
    # Open the selection section for each sv
    self.driver.find_elements(By.CLASS_NAME,
                              'source-selector-trigger')[0].click()
    self.driver.find_elements(By.CLASS_NAME,
                              'source-selector-trigger')[1].click()
    # Update the source for the Count_Person_Female sv
    shared.select_source(self.driver, "CDC_Mortality_UnderlyingCause",
                         "Count_Person_Female")
    update_button = self.driver.find_element(By.CSS_SELECTOR,
                                             '.modal-footer .btn')
    update_button.click()
    shared.wait_for_loading(self.driver)
    # Check that results are correct
    chart_title = self.driver.find_element(By.CSS_SELECTOR,
                                           '.scatter-chart .chart-headers h4')
    self.assertEqual(
        chart_title.text,
        "Population Without Health Insurance (2022) vs Female Population (2004 to 2020)"
    )
    chart_source = self.driver.find_element(
        By.CSS_SELECTOR, '.scatter-chart .chart-headers .sources')
    self.assertTrue("wonder.cdc.gov" in chart_source.text)
    chart = self.driver.find_element(By.ID, 'scatterplot')
    circles = chart.find_elements(By.TAG_NAME, 'circle')
    self.assertGreater(len(circles), 20)

  def test_manually_enter_options(self):
    """Test entering place and stat var options manually will cause chart to
    show up.
    """
    self.driver.get(self.url_ + SCATTER_URL.replace('#visType=scatter', ''))

    # Click the scatter tab
    vis_type_options = self.driver.find_elements(By.CLASS_NAME,
                                                 'vis-type-option')
    for vis_type in vis_type_options:
      if 'Scatter' in vis_type.text:
        vis_type.click()
        break
    page_header = self.driver.find_element(By.CSS_SELECTOR, '.info-content h3')
    self.assertEqual(page_header.text, 'Scatter Plot')

    # Click the start button
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'start-button'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(By.CLASS_NAME, 'start-button').click()

    # Type california into the search box.
    element_present = EC.presence_of_element_located((By.ID, 'location-field'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    search_box_input = self.driver.find_element(By.ID, 'ac')
    search_box_input.send_keys(PLACE_SEARCH_CA)

    # Click on the first result.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'pac-item'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    first_result = self.driver.find_element(By.CSS_SELECTOR,
                                            '.pac-item:nth-child(1)')
    first_result.click()

    # Click continue
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'continue-button'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(By.CLASS_NAME, 'continue-button').click()

    # Wait for place types to load and click on 'County'
    element_present = EC.presence_of_element_located(
        (By.CSS_SELECTOR, '.place-type-selector .form-check-input'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    place_type_inputs = self.driver.find_elements(By.CSS_SELECTOR,
                                                  '.place-type-selector label')
    for input in place_type_inputs:
      if input.text == 'County':
        input.click()
        break

    # Click continue
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'continue-button'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(By.CLASS_NAME, 'continue-button').click()

    # Choose stat vars
    shared.wait_for_loading(self.driver)
    shared.click_sv_group(self.driver, "Demographics")
    element_present = EC.presence_of_element_located(
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(
        By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person').click()
    shared.wait_for_loading(self.driver)
    element_present = EC.presence_of_element_located(
        (By.ID, 'Median_Income_Persondc/g/Demographics-Median_Income_Person'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(
        By.ID,
        'Median_Income_Persondc/g/Demographics-Median_Income_Person').click()

    # Click continue
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'continue-button'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(By.CLASS_NAME, 'continue-button').click()

    # Assert chart is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(shared.charts_rendered)
    chart_title = self.driver.find_element(By.CSS_SELECTOR,
                                           '.scatter-chart .chart-headers h4')
    self.assertEqual(
        chart_title.text,
        'Median Age of Population (2022) vs Median Income of a Population (2022)'
    )
    chart = self.driver.find_element(By.ID, 'scatterplot')
    circles = chart.find_elements(By.TAG_NAME, 'circle')
    self.assertGreater(len(circles), 20)

  def test_landing_page_link(self):
    """Test one of the links on the landing page
    """
    self.driver.get(self.url_ + SCATTER_URL)

    # Click a link on the landing page
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'info-content'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(By.CSS_SELECTOR, '.info-content a').click()

    # Assert chart loads
    element_present = EC.presence_of_element_located((By.ID, 'scatterplot'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    chart = self.driver.find_element(By.ID, 'scatterplot')
    circles = chart.find_elements(By.TAG_NAME, 'circle')
    self.assertGreater(len(circles), 20)
