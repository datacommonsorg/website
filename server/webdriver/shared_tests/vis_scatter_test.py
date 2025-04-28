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

from server.webdriver.base_utils import find_elems
import server.webdriver.shared as shared

SCATTER_URL = '/tools/visualization#visType=scatter'
URL_HASH_1 = '&place=geoId/06&placeType=County&sv=%7B"dcid"%3A"Count_Person_NoHealthInsurance"%7D___%7B"dcid"%3A"Count_Person_Female"%7D'


class VisScatterTestMixin():
  """Mixins to test the scatter visualization page."""

  def test_server_and_page(self):
    """Test the server can run successfully."""
    self.driver.get(self.url_ + SCATTER_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/visualization.js'), 200)

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
    self.assertIn("Population Without Health Insurance ", chart_title.text)
    self.assertIn(" vs Female Population ", chart_title.text)
    chart = self.driver.find_element(By.ID, 'scatterplot')
    circles = chart.find_elements(By.TAG_NAME, 'circle')
    self.assertGreater(len(circles), 20)

    # Click all the chart options and assert results are correct.
    chart_option_inputs = self.driver.find_elements(
        By.CSS_SELECTOR,
        '.chart-footer-options .chart-option .form-check-input')
    for chart_option_input in chart_option_inputs:
      chart_option_input.click()
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
    self.assertIn("Population Without Health Insurance ", chart_title.text)
    self.assertIn(" vs Female Population ", chart_title.text)
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

    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type="County")

    # Choose stat vars
    shared.click_sv_group(self.driver, "Demographics")

    # Click on median age
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    # Click on median income
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Income_Persondc/g/Demographics-Median_Income_Person'))

    # Click continue
    shared.click_el(self.driver, (By.CLASS_NAME, 'continue-button'))

    # Assert chart is correct
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(shared.charts_rendered)
    chart_title = self.driver.find_element(By.CSS_SELECTOR,
                                           '.scatter-chart .chart-headers h4')
    self.assertIn("Median Age of Population ", chart_title.text)
    self.assertIn(" vs Median Income of a Population ", chart_title.text)
    circles = find_elems(self.driver,
                         by=By.CSS_SELECTOR,
                         value='#scatterplot circle')
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
