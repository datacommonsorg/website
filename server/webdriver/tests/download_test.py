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

from server.webdriver.base import WebdriverBaseTest
from server.webdriver.shared_tests.download_test import DownloadTestMixin

class TestDownload(DownloadTestMixin, WebdriverBaseTest):
    """Class to test download tool. Tests come from DownloadTestMixin."""
    DATACOMMONS_STRING = "Data Commons"

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
