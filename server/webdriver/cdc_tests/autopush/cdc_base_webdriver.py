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

from server.webdriver.base import WebdriverBaseTest
from server.webdriver.cdc_tests.base import CDC_AUTOPUSH_URL

# The tests in this file can be run with any CDC instance loaded with
# sample data from the custom_dc/sample folder.

# From project datcom-website-dev > Cloud Run: dc-autopush > Revisions
DEFAULT_CDC_TEST_BASE_URL = CDC_AUTOPUSH_URL

# Get base test url from the CDC_TEST_BASE_URL env variable,
# # defaulting to DEFAULT_CDC_TEST_BASE_URL
CDC_TEST_BASE_URL = os.environ.get('CDC_TEST_BASE_URL',
                                   DEFAULT_CDC_TEST_BASE_URL)
print(f'Running CDC tests against base URL: {CDC_TEST_BASE_URL}')


class CdcAutopushTestBase(WebdriverBaseTest):
  """Base class for CDC Autopush webdriver tests."""
  dc_title_string = "Custom Data Commons"

  @classmethod
  def get_class_server_url(cls):
    return CDC_TEST_BASE_URL
