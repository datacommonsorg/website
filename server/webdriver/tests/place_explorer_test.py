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

from server.routes.dev_place.utils import ORDERED_CATEGORIES
from server.routes.dev_place.utils import ORDERED_TOPICS
from server.webdriver import shared
from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.shared_tests.place_explorer_test import \
    PlaceExplorerTestMixin


class TestPlaceExplorer(PlaceExplorerTestMixin, BaseDcWebdriverTest):
  """Class to test place explorer page. Tests come from PlaceExplorerTestMixin."""

  def test_dev_place_overview_world(self):
    """Ensure place page revamp World page works"""
    self.driver.get(self.url_ + '/place/Earth?force_dev_places=true')

    # Assert the subheader contains the parent places.
    self.assertIsNotNone(find_elem(self.driver, value='place-info'))
    self.assertEqual(find_elem(self.driver, value='subheader').text, '')

    # Asert the related places box exists
    self.assertEqual(
        find_elem(self.driver, value='related-places-callout').text,
        'Places in World')

    # Assert we have data for all expected topics.
    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=ORDERED_CATEGORIES)

    # And that the categories have data in the overview
    topics_in_overview = set(
        ["Economics", "Health", "Demographics", "Environment", "Energy"])
    block_titles = find_elems(self.driver, value='block-title')
    self.assertEqual(set([block.text for block in block_titles]),
                     topics_in_overview)

    # Assert that every category is expected, and has at least one chart
    category_containers = find_elems(self.driver,
                                     value='category',
                                     path_to_elem=['charts-container'])
    self.assertEqual(len(category_containers), len(topics_in_overview))
    for category_container in category_containers:
      chart_containers = find_elems(category_container, value='chart-container')
      self.assertGreater(len(chart_containers), 0)

  def test_dev_place_demographics_world(self):
    """Ensure place page revamp World page works"""
    self.driver.get(self.url_ +
                    '/place/Earth?force_dev_places=true&category=Demographics')

    # Assert we have data for all expected topics.
    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=ORDERED_CATEGORIES)

    # Assert we see at least one map item with data.
    map_containers = find_elems(self.driver, value='map')
    self.assertGreater(len(map_containers), 0)
    map_geo_regions = find_elem(map_containers[0],
                                by=By.ID,
                                value='map-geo-regions',
                                path_to_elem=['map-items'])
    self.assertIsNotNone(map_geo_regions)
    self.assertEqual(
        len(find_elems(map_geo_regions, by=By.TAG_NAME, value='path')),
        238)  # country count.

  def test_dev_place_overview_california(self):
    """Ensure experimental dev place page content loads"""
    self.driver.get(self.url_ + '/place/geoId/06?force_dev_places=true')

    # Assert the subheader contains the parent places.
    self.assertIsNotNone(find_elem(self.driver, value='place-info'))
    self.assertEqual(
        find_elem(self.driver, value='subheader').text,
        'State in United States of America, North America')

    # Asert the related places box exists
    self.assertEqual(
        find_elem(self.driver, value='related-places-callout').text,
        'Places in California')

    # Assert the overview exists, has a summary and a map.
    self.assertNotEqual(
        len(
            find_elem(self.driver, by=By.CSS_SELECTOR,
                      value='.place-summary').text), "")
    self.assertIsNotNone(find_elem(self.driver, value='map-container'))

    # Assert the key demographics table has data
    self.assertEqual(
        len(
            find_elems(self.driver,
                       value='key-demographics-row',
                       path_to_elem=['key-demographics-table'])), 4)

    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=ORDERED_CATEGORIES)

    # And that the categories have data in the overview
    block_titles = find_elems(self.driver, value='block-title-text')
    self.assertEqual(set([block.text for block in block_titles]),
                     set(ORDERED_TOPICS))

    # Assert that every category is expected, and has at least one chart
    category_containers = find_elems(self.driver,
                                     value='category',
                                     path_to_elem=['charts-container'])
    self.assertEqual(len(category_containers), len(ORDERED_TOPICS))
    for category_container in category_containers:
      chart_containers = find_elems(category_container, value='chart-container')
      self.assertGreater(len(chart_containers), 0)

  def test_dev_place_overview_africa(self):
    """Ensure experimental dev place page content loads data for a continent."""
    self.driver.get(self.url_ + '/place/africa?force_dev_places=true')

    # Asert the related places box exists
    self.assertEqual(
        find_elem(self.driver, value='related-places-callout').text,
        'Places in Africa')

    categories_for_africa = [
        "Economics", "Health", "Equity", "Demographics", "Environment", "Energy"
    ]
    topics_for_africa = ['Overview'] + categories_for_africa
    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_for_africa)

    # And that the categories have data in the overview
    block_titles = find_elems(self.driver, value='block-title')
    self.assertEqual(set([block.text for block in block_titles]),
                     set(categories_for_africa))

    # Assert that every category is expected, and has at least one chart
    category_containers = find_elems(self.driver,
                                     value='category',
                                     path_to_elem=['charts-container'])
    self.assertEqual(len(category_containers), len(categories_for_africa))
    for category_container in category_containers:
      chart_containers = find_elems(category_container, value='chart-container')
      self.assertGreater(len(chart_containers), 0)

  def test_dev_place_chart_settings(self):
    """Ensure the charts in the new place page contain the expected settings"""
    self.driver.get(self.url_ + '/place/geoId/06?force_dev_places=true')

    self.assertTrue(
        find_elem(self.driver,
                  value='download-outlink',
                  path_to_elem=['charts-container']).text, 'Download')

    self.assertTrue(
        find_elem(self.driver,
                  value='explore-in-outlink',
                  path_to_elem=['charts-container']).text,
        'Explore in Timeline tool',
    )

  def test_explorer_redirect_place_explorer_populates_search_bar(self):
    """Test the redirection from explore to place explore for single place queries populates the search bar from the URL query"""
    usa_explore = '/explore#q=United%20States%20Of%20America'

    start_url = self.url_ + usa_explore
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
