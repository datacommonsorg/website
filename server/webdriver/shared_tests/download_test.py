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
import os
import urllib.request

from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import server.webdriver.shared as shared
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

DOWNLOAD_URL = '/tools/download'
PLACE_SEARCH_CA = 'California'
TABLE_HEADERS = [
    'placeDcid', 'placeName', 'Date:Median_Age_Person',
    'Value:Median_Age_Person', 'Source:Median_Age_Person', 'Date:Count_Person',
    'Value:Count_Person', 'Source:Count_Person'
]
TABLE_ROW_1 = [
    'geoId/06001', 'Alameda County', '2022', '38.4',
    'https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html',
    '2022', '1628997', 'https://www2.census.gov/programs-surveys/popest/tables'
]
MAX_NUM_FILE_CHECK_TRIES = 3


# Mixins to test the download tool.
class DownloadTestMixin():

  def test_server_and_page(self):
    """Test the server can run successfully."""
    TITLE_TEXT = "Download Tool - " + self.DATACOMMONS_STRING
    self.driver.get(self.URL + DOWNLOAD_URL)

    # Assert 200 HTTP code: successful page load.
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert 200 HTTP code: successful JS generation.
    req = urllib.request.Request(self.URL + '/download.js')
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(TITLE_TEXT))
    self.assertEqual(TITLE_TEXT, self.driver.title)

  def test_manually_enter_options(self):
    """
    Test entering options will show preview and allow download of a file
    """
    self.driver.get(self.URL + DOWNLOAD_URL)

    # Wait until search box is present.
    element_present = EC.presence_of_element_located((By.ID, 'ac'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    search_box_input = self.driver.find_element(By.ID, 'ac')

    # Type california into the search box.
    search_box_input.send_keys(PLACE_SEARCH_CA)

    # Wait until there is at least one result in autocomplete results.
    element_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'pac-item'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Click on the first result.
    first_result = self.driver.find_element(By.CSS_SELECTOR,
                                            '.pac-item:nth-child(1)')
    first_result.click()
    element_present = EC.presence_of_element_located((By.CLASS_NAME, 'chip'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Choose place type
    shared.wait_for_loading(self.driver)
    element_present = EC.text_to_be_present_in_element(
        (By.ID, 'place-selector-place-type'), "County")
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    selects = Select(
        self.driver.find_element(By.ID, 'place-selector-place-type'))
    selects.select_by_value('County')

    # Choose stat var
    shared.wait_for_loading(self.driver)
    shared.click_sv_group(self.driver, "Demographics")
    element_present = EC.presence_of_element_located(
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(
        By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person').click()

    # Choose another stat var
    shared.wait_for_loading(self.driver)
    shared.click_sv_group(self.driver, "Demographics")
    element_present = EC.presence_of_element_located(
        (By.ID, 'Count_Persondc/g/Demographics-Count_Person'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    self.driver.find_element(
        By.ID, 'Count_Persondc/g/Demographics-Count_Person').click()

    # Click preview
    shared.wait_for_loading(self.driver)
    self.driver.find_element(
        By.XPATH, '//*[@id="plot-container"]/div[1]/div/div/button').click()

    # Assert preview table is correct
    shared.wait_for_loading(self.driver)
    element_present = EC.presence_of_element_located(
        (By.XPATH, '//*[@id="preview-section"]/table'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)
    # Assert table headers are correct
    table_headers = self.driver.find_elements(By.TAG_NAME, 'th')
    for idx, header in enumerate(table_headers):
      self.assertEqual(header.text, TABLE_HEADERS[idx])
    # Assert table body is correct
    table_body = self.driver.find_elements(By.TAG_NAME, 'tbody')[0]
    table_rows = table_body.find_elements(By.TAG_NAME, 'tr')
    self.assertGreater(len(table_rows), 1)
    first_row_cells = table_rows[0].find_elements(By.TAG_NAME, 'td')
    for idx, cell in enumerate(first_row_cells):
      self.assertEqual(cell.text, TABLE_ROW_1[idx])

    # Click download
    self.driver.find_element(By.XPATH,
                             '//*[@id="preview-section"]/button').click()

    # Assert file downloaded
    num_tries = 0
    # Wait max tries until the downloads folder is no longer empty
    while (num_tries < MAX_NUM_FILE_CHECK_TRIES):
      shared.wait_for_loading(self.driver)
      downloaded_files = os.listdir(self.downloads_folder.name)
      if (len(downloaded_files) > 0):
        break
      num_tries += 1
    self.assertEqual(downloaded_files[0], "California_County.csv")
