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
from server.webdriver.base import WebdriverBaseTest
from server.webdriver.cdc_tests.base import CDC_AUTOPUSH_URL

# Base class for Custom DC Autopush webdriver tests.
class CdcAutopushTestBase(WebdriverBaseTest):
    """Base class for CDC Autopush webdriver tests."""
    DATACOMMONS_STRING = "Custom Data Commons"

    def get_server_url(self):
        return CDC_AUTOPUSH_URL
