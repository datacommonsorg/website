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

import pytest
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.routes.dev_place.utils import ORDERED_TOPICS
from server.webdriver import shared
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import scroll_to_elem
from server.webdriver.base_utils import wait_for_text

MTV_URL = '/place/geoId/0649670'
USA_URL = '/place/country/USA'
CA_URL = '/place/geoId/06'
PLACE_SEARCH = 'California, USA'
NO_DATA_NEIGHBORHOOD_URL = '/place/wikidataId/Q995366'


def element_has_text(driver, locator):
  """Custom expected condition to check if element has text."""
  element = driver.find_element(*locator)
  if element.text:
    return element
  else:
    return False


class PlaceExplorerTestMixin():
  """Mixins to test the place explorer page."""

  def test_page_serve_usa(self):
    """Test the place explorer page for USA can be loaded successfullly."""
    title_text = "United States of America - " + self.dc_title_string
    place_type_text = "Country in North America"

    # Load USA page.
    self.driver.get(self.url_ + USA_URL)

    # Wait until the page loads and the title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))
    self.assertEqual(title_text, self.driver.title)

    # Wait for place name to load
    place_name_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '[data-testid="place-name"]'),
        'United States of America')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(place_name_present)

    # Wait for subheader to load and contain "Country in"
    subheader_present = EC.text_to_be_present_in_element(
        (By.CLASS_NAME, 'subheader'), 'Country in')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subheader_present)

  def test_page_serve_mtv(self):
    """Test the place explorer page for MTV can be loaded successfullly."""
    place_type_title = "City in Santa Clara County, California, United States of America, North America, World"
    title_text = "Mountain View - " + self.dc_title_string

    # Load Mountain View Page.
    self.driver.get(self.url_ + MTV_URL)

    # Wait until the page loads and the title is correct.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains(title_text))

    # Assert title is correct.
    self.assertEqual(title_text, self.driver.title)

    # Wait for place name to load
    place_name_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '[data-testid="place-name"]'), 'Mountain View')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(place_name_present)

    # Wait for subheader to load and contain "City in"
    subheader_present = EC.text_to_be_present_in_element(
        (By.CLASS_NAME, 'subheader'), place_type_title)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(subheader_present)

    # Wait for summary container to load
    summary_title_present = EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, '[data-testid="place-overview-summary-title"]'),
        'Summary')
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(summary_title_present)

    # Wait for overview table to load
    table_present = EC.presence_of_element_located(
        (By.CSS_SELECTOR, '[data-testid="place-overview-table"]'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(table_present)

    # Check that unemployment rate is in the table
    table_text = self.driver.find_element(
        By.CSS_SELECTOR, '[data-testid="place-overview-table"]').text
    self.assertIn("Unemployment Rate", table_text)

  def test_demographics_link(self):
    """Test the demographics link can work correctly."""
    title_text = "Median age by gender: states near California"
    # Load California page.
    self.driver.get(self.url_ + CA_URL)

    # Find demographic link in explore topics box
    topics_for_ca = [
        "Economics", "Health", "Equity", "Crime", "Education", "Demographics",
        "Housing", "Environment", "Energy"
    ]
    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_for_ca)

    demographics = find_elem(
        self.driver,
        by=By.CSS_SELECTOR,
        value='.item-list-item[data-testid="Demographics"] a')
    demographics.click()
    self.driver.get(self.driver.current_url)

    # Wait until the new page has loaded and check for text
    wait_for_text(self.driver, "Demographics", By.CSS_SELECTOR,
                  'span[data-testid="place-name"]')

    # Assert that Demographics is part of the new url
    self.assertTrue("Demographics" in self.driver.current_url)

  def test_demographics_redirect_link(self):
    """Test a place page with demographics after a redirect."""
    # Load California's Demographics page.
    start_url = self.url_ + '/place?dcid=geoId/06&category=Demographics&utm_medium=um'
    self.driver.get(start_url)

    # Wait for redirect.
    WebDriverWait(
        self.driver,
        self.TIMEOUT_SEC).until(lambda driver: driver.current_url != start_url)
    self.assertTrue("category=Demographics" in self.driver.current_url)
    self.assertTrue("utm_medium=um" in self.driver.current_url)

    # Wait for place name to show correct text
    wait_for_text(self.driver, "California • Demographics", By.CSS_SELECTOR,
                  '[data-testid="place-name"]')

  def test_explorer_redirect_place_explorer(self):
    """Test the redirection from explore to place explore for single place queries"""
    usa_explore = '/explore#q=United%20States%20Of%20America'

    start_url = self.url_ + usa_explore
    self.driver.get(start_url)

    # Assert 200 HTTP code: successful page load.
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Wait for redirect and page load.
    redirect_finished = EC.url_changes(start_url)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(redirect_finished)
    shared.wait_for_loading(self.driver)

    # Assert redirected URL is correct and contains the query string.
    self.assertTrue('place/country/USA?q=United+States+Of+America' in
                    self.driver.current_url)

    # Assert page title is correct.
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains('United States of America'))

  def test_canonical_links_in_html_head(self):
    """Test that canonical and alternate language links are present in HTML head"""
    # Test overview page links
    self.driver.get(self.url_ + '/place/geoId/06')

    # Get page source and check canonical link
    page_source = self.driver.page_source
    self.assertIn(
        '<link rel="canonical" href="https://datacommons.org/place/geoId/06">',
        page_source)

    # Check alternate language links
    self.assertIn(
        '<link rel="alternate" hreflang="en" href="https://datacommons.org/place/geoId/06">',
        page_source)
    self.assertIn(
        '<link rel="alternate" hreflang="ru" href="https://datacommons.org/place/geoId/06?hl=ru">',
        page_source)
    self.assertIn(
        '<link rel="alternate" hreflang="x-default" href="https://datacommons.org/place/geoId/06">',
        page_source)

    # Test category page links
    self.driver.get(self.url_ + '/place/geoId/06?category=Health')
    page_source = self.driver.page_source

    self.assertIn(
        '<link rel="canonical" href="https://datacommons.org/place/geoId/06?category=Health">',
        page_source)
    self.assertIn(
        '<link rel="alternate" hreflang="en" href="https://datacommons.org/place/geoId/06?category=Health">',
        page_source)
    self.assertIn(
        '<link rel="alternate" hreflang="ru" href="https://datacommons.org/place/geoId/06?category=Health&amp;hl=ru">',
        page_source)
    self.assertIn(
        '<link rel="alternate" hreflang="x-default" href="https://datacommons.org/place/geoId/06?category=Health">',
        page_source)

    # Test invalid category
    self.driver.get(self.url_ +
                    '/place/geoId/06?category=Health,InvalidCategory')
    page_source = self.driver.page_source

    # Invalid category should redirect to overview page
    self.assertIn(
        '<link rel="canonical" href="https://datacommons.org/place/geoId/06">',
        page_source)

  def test_neighborhood_no_data(self):
    """Test that neighborhood place page shows correct type and no data message."""
    # Load neighborhood page
    self.driver.get(self.url_ + NO_DATA_NEIGHBORHOOD_URL)

    # Wait for subheader to load and contain "Neighborhood in"
    wait_for_text(self.driver, "Neighborhood in", By.CLASS_NAME, 'subheader')

    # Wait for no data message to appear
    wait_for_text(self.driver, "No data found for", By.CLASS_NAME,
                  'page-content-container')

  def test_place_category_placeholder(self):
    """Test that the place category placeholder is correct."""
    # Load CA housing page
    ca_housing_url = CA_URL + "?category=Housing"
    self.driver.get(self.url_ + ca_housing_url)

    # Wait for search input to be present
    wait_for_text(self.driver, "Housing in California", By.ID,
                  "query-search-input")

    # Wait for placeholder text to update to expected value
    def placeholder_has_text(driver):
      element = driver.find_element(By.ID, "query-search-input")
      return element.get_attribute("placeholder") == "Housing in California"

    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(placeholder_has_text)

  def test_dev_place_overview_world(self):
    """Ensure place page revamp World page works"""
    self.driver.get(self.url_ + '/place/Earth')

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
    self.driver.get(self.url_ + '/place/Earth?category=Demographics')

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

  def test_dev_place_overview_world_redirect(self):
    """Ensure click on place link from the demographics page redirects to the overview page"""
    self.driver.get(self.url_ + '/place/Earth?category=Demographics')

    # Click the place link and verify it takes us to the overview page
    place_link = find_elem(self.driver,
                           by=By.CSS_SELECTOR,
                           value='.place-info-link')
    place_link.click()

    # Wait for URL change and page load
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.url_to_be(self.url_ + '/place/Earth'))

  def test_dev_place_overview_california(self):
    """Ensure experimental dev place page content loads"""
    self.driver.get(self.url_ + '/place/geoId/06')

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
    self.driver.get(self.url_ + '/place/geoId/06081')

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
    self.driver.get(self.url_ + '/place/geoId/0644000')

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
    self.driver.get(self.url_ + '/place/zip/90003')

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
    self.driver.get(self.url_ + '/place/africa')

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
    self.driver.get(self.url_ + '/place/geoId/06')

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

  @pytest.mark.skip(reason="Fix theme compile error before re-enabling")
  def test_dev_place_ai_spark_icon_hover(self):
    self.driver.get(self.url_ + '/place/geoId/04')

    # Find the icon element that triggers the tooltip on hover.
    icon_element = find_elem(self.driver, value='spark-info-tooltip-icon')
    self.assertIsNotNone(icon_element)

    # Move the mouse to the icon element to trigger the hover.
    actions = ActionChains(self.driver)
    actions.move_to_element(icon_element).perform()

    # Wait for the tooltip to become visible.
    self.driver.implicitly_wait(2)

    # Find the tooltip element.
    tooltip_element = find_elem(self.driver, value='info-tooltip-hover')

    # Assert that the tooltip element is visible.
    self.assertTrue(tooltip_element.is_displayed())
    self.assertIn("We use AI to summarize", tooltip_element.text)
