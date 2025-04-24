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

    shared.search_for_california_counties(self, self.driver)

    # Choose stat var
    shared.click_sv_group(self.driver, "Demographics")
    shared.click_el(
        self.driver,
        (By.ID, 'Median_Age_Persondc/g/Demographics-Median_Age_Person'))

    # Choose another stat var
    shared.click_el(self.driver,
                    (By.ID, 'Count_Persondc/g/Demographics-Count_Person'))

    # Click preview
    shared.wait_for_loading(self.driver)
    shared.click_el(
        self.driver,
        (By.XPATH, '//*[@id="plot-container"]/div[1]/div/div/button'))

    # Assert preview table is correct
    shared.wait_for_loading(self.driver)
    preview_section = find_elem(self.driver, by=By.ID, value='preview-section')
    table = wait_elem(preview_section, by=By.TAG_NAME, value='table')

    # Assert table headers are correct
    header_elements = find_elems(table, by=By.TAG_NAME, value='th')
    actual_headers = [h.text for h in header_elements]
    self.assertSetEqual(set(actual_headers), set(TABLE_HEADERS))

    # Assert table body is correct
    table_body = find_elem(table, by=By.TAG_NAME, value='tbody')
    table_rows = find_elems(table_body, by=By.TAG_NAME, value='tr')
    self.assertGreater(len(table_rows), 1)

    # Create a map of header text to cell text for the first row
    first_row_cell_elements = find_elems(table_rows[0],
                                         by=By.TAG_NAME,
                                         value='td')
    actual_row_data = {
        actual_headers[i]: cell.text
        for i, cell in enumerate(first_row_cell_elements)
    }

    # Check each expected value against the actual data using the header map
    for i, expected_header in enumerate(TABLE_HEADERS):
      if TABLE_ROW_1[i] != SKIP_CHECK:
        self.assertEqual(actual_row_data.get(expected_header), TABLE_ROW_1[i],
                         f"Mismatch for header: {expected_header}")

    # Click download
    shared.click_el(self.driver,
                    (By.XPATH, '//*[@id="preview-section"]/button'))

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
