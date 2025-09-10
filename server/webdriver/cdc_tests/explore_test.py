# Copyright 2025 Google LLC
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

from server.webdriver import shared
from server.webdriver.cdc_tests.cdc_base_webdriver import CdcTestBase
from server.webdriver.shared_tests.explore_test import EXPLORE_URL, ExplorePageTestMixin


class TestExplorePage(ExplorePageTestMixin, CdcTestBase):
  """Class to test the explore page for Custom DC. Tests come from ExplorePageTestMixin."""

  def test_success_result_with_no_follow_up_questions(self):
    """Test success result when follow up questions is not enabled."""

    params = '?disable_feature=follow_up_questions_ga&disable_feature=explore_result_header'
    params = ''
    query = '#q=What is the population of Mountain View'

    self.driver.get(self.url_ + EXPLORE_URL + params + query)
    shared.wait_elem(driver=self.driver, value="follow-up-questions-container")

    # Follow Up Questions should not be present
    empty_follow_up = shared.find_elem(parent=self.driver,
                                       value="follow-up-questions-container")
    self.assertIsNone(
        empty_follow_up,
        "Follow Up Questions component is not empty despite the flag not being activated."
    )
    # While Related Topics section should appear
    topic_buttons = shared.find_elem(self.driver, By.CLASS_NAME,
                                     'explore-relevant-topics')
    self.assertIsNotNone(topic_buttons, "Topic buttons element not found")

  def test_success_result_with_no_page_overview(self):
    """Test success result when page overview is not enabled."""
    query = "#q=What is the population of Mountain View?"

    self.driver.get(self.url_ + EXPLORE_URL + query)

    # Page Overview should not be present
    self.assertIsNone(
        shared.wait_elem(driver=self.driver,
                         by=By.CSS_SELECTOR,
                         value='[data-testid="page-overview-inner"]'),
        "Page Overview component is not empty despite the flag not being activated."
    )
