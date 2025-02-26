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
import os
import tempfile

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_elem

DOWNLOAD_URL = '/tools/download'
PLACE_SEARCH_CA = 'California'
SKIP_CHECK = 'SKIP_CHECK'
TABLE_HEADERS = [
    'placeDcid', 'placeName', 'Date:Median_Age_Person',
    'Value:Median_Age_Person', 'Source:Median_Age_Person', 'Date:Count_Person',
    'Value:Count_Person', 'Source:Count_Person'
]
# SKIP_CHECK for the values that change with each import.
TABLE_ROW_1 = [
    'geoId/06001', 'Alameda County', SKIP_CHECK, SKIP_CHECK,
    'https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html',
    SKIP_CHECK, SKIP_CHECK,
    'https://www2.census.gov/programs-surveys/popest/tables'
]
MAX_NUM_FILE_CHECK_TRIES = 3


class DownloadTestMixin():
  """Mixins to test the download tool."""

  def setUp(self):
    """
        In addition to the base test setUp, need to also create a temporary
        directory to use for downloaded files
        """
    self.downloads_folder = tempfile.TemporaryDirectory()
    preferences = {"download.default_directory": self.downloads_folder.name}
    super().setUp(preferences)

  def tearDown(self):
    """
        In addition to base test tearDown, need to also clean up the temporary
        directory that was created.
        """
    self.downloads_folder.cleanup()
    super().tearDown()

  def test_server_and_page(self):
    """Test the server can run successfully."""
    title_text = "Download Tool - " + self.dc_title_string
    self.driver.get(self.url_ + DOWNLOAD_URL)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/download.js'), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

  def test_manually_enter_options(self):
    """
        Test entering options will show preview and allow download of a file
        """
    self.driver.get(self.url_ + DOWNLOAD_URL)

    # Wait until search box is present and type california.
    shared.wait_for_loading(self.driver)
    search_box_input = find_elem(self.driver, by=By.ID, value='ac')
    search_box_input.send_keys(PLACE_SEARCH_CA)

    # Wait until there is at least one result in autocomplete results, click the 1st result.
    wait_elem(self.driver, value='pac-item')
    california = find_elem(self.driver,
                           by=By.CSS_SELECTOR,
                           value='.pac-item:nth-child(1)')
    california.click()
    wait_elem(self.driver, value='chip')

    # Choose place type
    shared.wait_for_loading(self.driver)
    place_selector_place_type = find_elem(self.driver,
                                          by=By.ID,
                                          value='place-selector-place-type')
    Select(place_selector_place_type).select_by_value('County')

    # Choose stat var
    shared.wait_for_loading(self.driver)
    shared.click_sv_group(self.driver, "Demographics")
    stat_var = find_elem(
        self.driver,
        by=By.ID,
        value='Median_Age_Persondc/g/Demographics-Median_Age_Person')
    stat_var.click()

    # Choose another stat var
    shared.wait_for_loading(self.driver)
    shared.click_sv_group(self.driver, "Demographics")

    other_stat_var = find_elem(
        self.driver,
        by=By.ID,
        value='Count_Persondc/g/Demographics-Count_Person')
    other_stat_var.click()

    # Click preview
    shared.wait_for_loading(self.driver)

    find_elem(self.driver,
              by=By.XPATH,
              value='//*[@id="plot-container"]/div[1]/div/div/button').click()

    # Assert preview table is correct
    shared.wait_for_loading(self.driver)
    preview_section = find_elem(self.driver, by=By.ID, value='preview-section')
    table = wait_elem(preview_section, by=By.TAG_NAME, value='table')

    # Assert table headers are correct
    table_headers = find_elems(table, by=By.TAG_NAME, value='th')
    for idx, header in enumerate(table_headers):
      self.assertEqual(header.text, TABLE_HEADERS[idx])
    # Assert table body is correct
    table_body = find_elem(table, by=By.TAG_NAME, value='tbody')
    table_rows = find_elems(table_body, by=By.TAG_NAME, value='tr')
    self.assertGreater(len(table_rows), 1)
    first_row_cells = find_elems(table_rows[0], by=By.TAG_NAME, value='td')
    for idx, cell in enumerate(first_row_cells):
      if SKIP_CHECK not in TABLE_ROW_1[idx]:
        self.assertEqual(cell.text, TABLE_ROW_1[idx])

    # Click download
    find_elem(self.driver,
              by=By.XPATH,
              value='//*[@id="preview-section"]/button').click()

    # Assert file downloaded
    num_tries = 0
    # Wait max tries until the downloads folder is no longer empty
    while num_tries < MAX_NUM_FILE_CHECK_TRIES:
      shared.wait_for_loading(self.driver)
      downloaded_files = os.listdir(self.downloads_folder.name)
      if len(downloaded_files) > 0:
        break
      num_tries += 1
    self.assertEqual(downloaded_files[0], "California_County.csv")
