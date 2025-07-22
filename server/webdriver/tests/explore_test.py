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

from percy import percy_snapshot
from selenium.webdriver.common.by import By

from server.webdriver import shared
from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.shared_tests.explore_test import EXPLORE_URL
from server.webdriver.shared_tests.explore_test import ExplorePageTestMixin


class TestExplorePage(ExplorePageTestMixin, BaseDcWebdriverTest):
  """Class to test explore page. Tests come from ExplorePageTestMixin."""

  def test_follow_up_questions_typical(self):
    """Test that the Follow Up Questions are generated and displayed when queries have related topics."""
    follow_up_flag = "?enable_feature=follow_up_questions_ga"
    query = "#q=What is the population of Mountain View?"

    self.driver.get(self.url_ + EXPLORE_URL + follow_up_flag + query)
    shared.wait_elem(driver=self.driver, value="follow-up-questions-container")

    follow_up_questions = find_elems(self.driver, By.CLASS_NAME,
                                     'follow-up-questions-list-text')
    self.assertGreater(len(follow_up_questions), 0,
                       "No follow up questions found in the list.")

    percy_snapshot(self.driver, self.dc_title_string + ' Explore Follow Up Questions Typical')

  def test_follow_up_questions_no_related_topics(self):
    """Test that the Follow Up Questions component does not exist for queries that have no related topics."""
    follow_up_flag = "?enable_feature=follow_up_questions_ga"
    # The query below has no related topics identified.
    query = "#q=Which countries have the highest college-educated population in the world?"

    self.driver.get(self.url_ + EXPLORE_URL + follow_up_flag + query)
    shared.wait_elem(driver=self.driver, value="follow-up-questions-container")

    empty_follow_up = find_elem(parent=self.driver,
                                value="follow-up-questions-container")
    self.assertIsNone(
        empty_follow_up,
        "Follow Up Questions component is not empty despite having no related topics."
    )

    percy_snapshot(self.driver, self.dc_title_string + ' Explore no follow up questions')
