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

import tempfile

from server.webdriver.shared_tests.download_test import DownloadTestMixin


from server.webdriver.base import WebdriverBaseTest
import server.webdriver.shared as shared
from server.webdriver.cdc_tests.base import CDC_AUTOPUSH_URL


# Class to test the download tool for Custom DC
class TestDownload(DownloadTestMixin, WebdriverBaseTest):
  DATACOMMONS_STRING = "Custom Data Commons"

  def get_server_url(self):
    return CDC_AUTOPUSH_URL
    
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
