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

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared
from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.shared_tests.place_explorer_i18n_test import \
    PlaceI18nExplorerTestMixin


class TestPlaceI18nExplorer(PlaceI18nExplorerTestMixin, BaseDcWebdriverTest):
  """Class to test i18n place explorer page. Tests come from PlaceI18nExplorerTestMixin."""

  def test_explorer_redirect_place_explorer_populates_search_bar(self):
    """Test the redirection from explore to place explore for single place queries populates the search bar from the URL query"""
    usa_explore_fr_locale = '/explore?hl=fr#q=United%20States%20Of%20America'

    start_url = self.url_ + usa_explore_fr_locale
    self.driver.get(start_url)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Wait for redirect and page load
    redirect_finished = EC.url_changes(start_url)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(redirect_finished)
    shared.wait_for_loading(self.driver)

    # Ensure the query string is set in the NL Search Bar.
    search_bar_present = EC.presence_of_element_located(
        (By.ID, 'query-search-input'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(search_bar_present)
    search_bar = self.driver.find_element(By.ID, 'query-search-input')
    self.assertEqual(search_bar.get_attribute('value'),
                     'United States Of America')
