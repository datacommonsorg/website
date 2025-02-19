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

from server.routes.dev_place.utils import ORDERED_TOPICS
from server.webdriver import shared
from server.webdriver.base_dc_webdriver import BaseDcWebdriverTest
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import scroll_to_elem
from server.webdriver.shared_tests.place_explorer_test import \
    PlaceExplorerTestMixin


class TestPlaceExplorer(PlaceExplorerTestMixin, BaseDcWebdriverTest):
  """Class to test place explorer page. Tests come from PlaceExplorerTestMixin."""

  def test_dev_place_overview_world(self):
    """Ensure place page revamp World page works"""
    self.driver.get(self.url_ + '/place/Earth?force_dev_places=true')

    # Assert the subheader contains the parent places.
    self.assertIsNotNone(find_elem(self.driver, value='place-info'))
    self.assertIsNone(find_elem(self.driver, value='subheader'))

    # Asert the related places box exists
    self.assertEqual(
        find_elem(self.driver, value='related-places-callout').text,
        'Places in World')

    # Assert we have data for all expected topics.
    topics_for_world = [
        "Economics", "Health", "Equity", "Crime", "Demographics", "Housing",
        "Environment", "Energy"
    ]
    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_for_world)

    # And that the categories have data in the overview
    block_titles = find_elems(self.driver, value='block-title-text')
    self.assertEqual(set([block.text for block in block_titles]),
                     set(topics_for_world))

    # Assert that every category is expected, and has at least one chart
    category_containers = find_elems(self.driver,
                                     value='category',
                                     path_to_elem=['charts-container'])
    self.assertEqual(len(category_containers), len(topics_for_world))
    for category_container in category_containers:
      chart_containers = find_elems(category_container, value='chart-container')
      self.assertGreater(len(chart_containers), 0)

  def test_dev_place_demographics_world(self):
    """Ensure place page revamp World page works"""
    self.driver.get(self.url_ +
                    '/place/Earth?force_dev_places=true&category=Demographics')

    # Assert we have data for all expected topics.
    topics_for_world = [
        "Economics", "Health", "Equity", "Crime", "Demographics", "Housing",
        "Environment", "Energy"
    ]
    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_for_world)

    # Scroll to a map chart.
    map_container = scroll_to_elem(self.driver, value='map-chart')
    self.assertIsNotNone(map_container)

    map_geo_regions = find_elem(map_container,
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
        'State in United States of America, North America, World')

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
                         expected_topics=ORDERED_TOPICS)

    # And that the categories have data in the overview
    topics_in_overview = [
        "Economics", "Health", "Equity", "Crime", "Education", "Demographics",
        "Housing", "Energy"
    ]
    block_titles = find_elems(self.driver, value='block-title-text')
    self.assertEqual([block.text for block in block_titles], topics_in_overview)

    # Assert that every category is expected, and has at least one chart
    category_containers = find_elems(self.driver,
                                     value='category',
                                     path_to_elem=['charts-container'])
    self.assertEqual(len(category_containers), len(topics_in_overview))
    for category_container in category_containers:
      chart_containers = find_elems(category_container, value='chart-container')
      self.assertGreater(len(chart_containers), 0)

  def test_dev_place_overview_san_mateo_county(self):
    """Ensure experimental dev place page content loads"""
    self.driver.get(self.url_ + '/place/geoId/06081?force_dev_places=true')

    # Assert the subheader contains the parent places.
    self.assertIsNotNone(find_elem(self.driver, value='place-info'))
    self.assertEqual(
        find_elem(self.driver, value='subheader').text,
        'County in California, United States of America, North America, World')

    # Asert the related places box exists
    self.assertEqual(
        find_elem(self.driver, value='related-places-callout').text,
        'Places in San Mateo County')

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

    # And that the categories have data
    topics_in_overview = [
        "Economics", "Health", "Equity", "Crime", "Education", "Demographics",
        "Housing"
    ]
    topics_with_data = topics_in_overview + ["Environment"]

    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_with_data)

    block_titles = find_elems(self.driver, value='block-title-text')
    self.assertEqual([block.text for block in block_titles], topics_in_overview)

    # Assert that every category is expected, and has at least one chart
    category_containers = find_elems(self.driver,
                                     value='category',
                                     path_to_elem=['charts-container'])
    self.assertEqual(len(category_containers), len(topics_in_overview))
    for category_container in category_containers:
      chart_containers = find_elems(category_container, value='chart-container')
      self.assertGreater(len(chart_containers), 0)

  def test_dev_place_overview_los_angeles(self):
    """Ensure experimental dev place page content loads"""
    self.driver.get(self.url_ + '/place/geoId/0644000?force_dev_places=true')

    # Assert the subheader contains the parent places.
    self.assertIsNotNone(find_elem(self.driver, value='place-info'))
    self.assertEqual(
        find_elem(self.driver, value='subheader').text,
        'City in Los Angeles County, California, United States of America, North America, World'
    )

    # Asert the related places box exists
    self.assertEqual(
        find_elem(self.driver, value='related-places-callout').text,
        'Places in Los Angeles')

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

    # And that the categories have data
    topics_in_overview = [
        "Economics", "Health", "Equity", "Crime", "Education", "Demographics",
        "Housing"
    ]
    topics_with_data = topics_in_overview + ["Environment"]

    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_with_data)

    block_titles = find_elems(self.driver, value='block-title-text')
    self.assertEqual([block.text for block in block_titles], topics_in_overview)

    # Assert that every category is expected, and has at least one chart
    category_containers = find_elems(self.driver,
                                     value='category',
                                     path_to_elem=['charts-container'])
    self.assertEqual(len(category_containers), len(topics_in_overview))
    for category_container in category_containers:
      chart_containers = find_elems(category_container, value='chart-container')
      self.assertGreater(len(chart_containers), 0)

  def test_dev_place_overview_zip_90003(self):
    """Ensure experimental dev place page content loads"""
    self.driver.get(self.url_ + '/place/zip/90003?force_dev_places=true')

    # Assert the subheader contains the parent places.
    self.assertIsNotNone(find_elem(self.driver, value='place-info'))
    self.assertEqual(
        find_elem(self.driver, value='subheader').text,
        'ZIP Code in Los Angeles, Los Angeles County, California, United States of America, North America, World'
    )

    # Asert the related places box does not exist
    self.assertIsNone(find_elem(self.driver, value='related-places-callout'))

    # Assert the overview exists, has a map. Zips have no summaries.
    self.assertIsNotNone(find_elem(self.driver, value='map-container'))

    # Assert the key demographics table has data
    self.assertEqual(
        len(
            find_elems(self.driver,
                       value='key-demographics-row',
                       path_to_elem=['key-demographics-table'])), 3)

    # And that the categories have data
    topics_in_overview = [
        "Economics", "Health", "Equity", "Education", "Demographics", "Housing"
    ]

    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_in_overview)

    block_titles = find_elems(self.driver, value='block-title-text')
    self.assertEqual([block.text for block in block_titles], topics_in_overview)

    # Assert that every category is expected, and has at least one chart
    category_containers = find_elems(self.driver,
                                     value='category',
                                     path_to_elem=['charts-container'])
    self.assertEqual(len(category_containers), len(topics_in_overview))
    for category_container in category_containers:
      chart_containers = find_elems(category_container, value='chart-container')
      self.assertGreater(len(chart_containers), 0)

  def test_dev_place_overview_africa(self):
    """Ensure experimental dev place page content loads data for a continent."""
    self.driver.get(self.url_ + '/place/africa?force_dev_places=true')

    # Assert the subheader contains the parent places.
    self.assertIsNotNone(find_elem(self.driver, value='place-info'))
    self.assertEqual(
        find_elem(self.driver, value='subheader').text, 'Continent in World')

    # Asert the related places box exists
    self.assertEqual(
        find_elem(self.driver, value='related-places-callout').text,
        'Places in Africa')

    topics_for_africa = [
        "Economics", "Health", "Equity", "Demographics", "Environment", "Energy"
    ]
    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_for_africa)

    # And that the categories have data in the overview
    block_titles = find_elems(self.driver, value='block-title-text')
    self.assertEqual([block.text for block in block_titles], topics_for_africa)

    # Assert that every category is expected, and has at least one chart
    category_containers = find_elems(self.driver,
                                     value='category',
                                     path_to_elem=['charts-container'])
    self.assertEqual(len(category_containers), len(topics_for_africa))
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
