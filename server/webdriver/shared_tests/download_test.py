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

import pytest
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_elem

DOWNLOAD_URL = '/tools/download'
SKIP_CHECK = 'SKIP_CHECK'
TABLE_HEADERS = ['placeDcid', 'placeName', 'Date', 'Value', 'Source']
# SKIP_CHECK for the values that change with each import.
TABLE_ROW_1 = [
    'geoId/06001', 'Alameda County', SKIP_CHECK, SKIP_CHECK,
    'https://www.census.gov/programs-surveys/popest.html'
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
    self.driver.get(self.url_ + DOWNLOAD_URL +
                    '?enable_feature=use_new_download_tool')

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Assert 200 HTTP code: successful JS generation.
    self.assertEqual(shared.safe_url_open(self.url_ + '/download.js'), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

  @pytest.mark.one_at_a_time
  def test_manually_enter_options(self):
    """
        Test entering options will show preview and allow download of a file
        """
    self.driver.get(self.url_ + DOWNLOAD_URL +
                    '?enable_feature=use_new_download_tool')

    shared.search_for_places(self,
                             self.driver,
                             search_term="California",
                             place_type="County",
                             is_new_vis_tools=False)

    # Choose stat var
    shared.wait_for_invisibility_of_loaders(self.driver, self.TIMEOUT_SEC)
    shared.click_sv_group(self.driver, "Demographics")

    shared.wait_for_invisibility_of_loaders(self.driver, self.TIMEOUT_SEC)
    shared.click_el(self.driver,
                    (By.ID, 'Count_Persondc/g/Demographics-Count_Person'))
    # Wait for loading
    shared.wait_for_loading(self.driver)

    # Wait for table to load
    shared.wait_for_loading(self.driver)
    shared.wait_for_loading(self.driver)
    wait_elem(self.driver, By.CSS_SELECTOR, '#preview-section table')

    # Assert table headers are correct
    wait_elem(self.driver, By.CSS_SELECTOR, '#preview-section table th')
    header_elements = find_elems(self.driver,
                                 By.CSS_SELECTOR,
                                 value='#preview-section table th')
    actual_headers = [h.text for h in header_elements]
    self.assertSetEqual(set(actual_headers), set(TABLE_HEADERS))

    # Assert table body is correct
    table_rows = find_elems(self.driver,
                            By.CSS_SELECTOR,
                            value='#preview-section table tbody tr')
    self.assertGreater(len(table_rows), 1)

    # Wait for all cells in the first row to be fully rendered to prevent race conditions
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(lambda d: len(
        d.find_elements(By.CSS_SELECTOR,
                        '#preview-section table tbody tr:nth-child(1) td')) ==
                                                       len(actual_headers))

    # Re-retrieve cells now that they are guaranteed to be fully rendered
    first_row_cell_elements = find_elems(
        self.driver,
        By.CSS_SELECTOR,
        value='#preview-section table tbody tr:nth-child(1) td')

    actual_row_data = {}
    for header, cell in zip(actual_headers, first_row_cell_elements):
      try:
        # Extract link href if cell contains a link, otherwise use cell text
        link = cell.find_element(By.TAG_NAME, 'a')
        actual_row_data[header] = link.get_attribute('href')
      except NoSuchElementException:
        actual_row_data[header] = cell.text

    # Check each expected value against the actual data using the header map
    for i, expected_header in enumerate(TABLE_HEADERS):
      if TABLE_ROW_1[i] != SKIP_CHECK:
        self.assertEqual(actual_row_data.get(expected_header), TABLE_ROW_1[i],
                         f"Mismatch for header: {expected_header}")

    # Click download
    shared.click_el(self.driver, (By.CLASS_NAME, 'download-button'))

    # Assert file downloaded
    num_tries = 0
    # Wait max tries until the downloads folder is no longer empty
    while num_tries < MAX_NUM_FILE_CHECK_TRIES:
      shared.wait_for_loading(self.driver)
      downloaded_files = os.listdir(self.downloads_folder.name)
      if len(downloaded_files) > 0:
        break
      num_tries += 1
    self.assertEqual(downloaded_files[0], "California_County_Count_Person.csv")
