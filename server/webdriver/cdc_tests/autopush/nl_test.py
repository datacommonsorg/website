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

from server.integration_tests.explore_test import ExploreTest
from server.webdriver.base_utils import find_elem
from server.webdriver.cdc_tests.autopush.cdc_base_webdriver import \
    CdcAutopushTestBase


class CdcAutopushNLTest(ExploreTest, CdcAutopushTestBase):
  """Class to test the natural language queries for Custom DC."""

  def test_cdc_nl(self):
    """Run Query on custom DC stat var."""
    self.run_detect_and_fulfill('cdc_nl', ['gender wage gap in europe'])

  def test_ensure_inline_search_bar_is_displayed(self):
    """Test that the inline search bar is displayed for custom dc pages."""
    self.driver.get(self.url_ + '/explore')
    self.assertTrue(
        find_elem(self.driver,
                  by=By.CSS_SELECTOR,
                  value='.explore-container .search-bar').is_displayed())
