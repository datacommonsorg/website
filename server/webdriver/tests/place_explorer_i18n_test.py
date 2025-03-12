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
from server.webdriver.base_utils import find_elem
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
    self.assertEqual(
        find_elem(self.driver, by=By.ID,
                  value='query-search-input').get_attribute('value'),
        'United States Of America')

  def test_dev_place_page_loads_with_locale(self):
    """Ensure experimental dev place page content loads data for a continent."""
    self.driver.get(self.url_ + '/place/africa?force_dev_places=true&hl=fr')

    # Assert the subheader contains the parent places.
    self.assertIsNotNone(find_elem(self.driver, value='place-info'))
    # Assert the h1 has the localized place name
    self.assertEqual(
        find_elem(self.driver, by=By.CSS_SELECTOR,
                  value='.place-info h1 span').text, 'Afrique')

    # Asert the related places box exists
    self.assertEqual(
        find_elem(self.driver, value='related-places-callout').text,
        'Lieux en Afrique')

    topics_for_africa = [
        "Économie", "Santé", "Capitaux propres", "Données démographiques",
        "Environment", "Énergie"
    ]
    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_for_africa)

    # Assert the download link exists and has correct text
    download_link = find_elem(self.driver,
                              by=By.CSS_SELECTOR,
                              value=".download-outlink a")
    self.assertEqual(download_link.text, "Télécharger")
