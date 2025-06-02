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

from server.webdriver.cdc_tests.cdc_base_webdriver import CdcTestBase
from server.webdriver.shared_tests.download_test import DownloadTestMixin


class TestDownload(DownloadTestMixin, CdcTestBase):
  """Class to test the download tool for Custom DC. Tests come from DownloadTestMixin"""
