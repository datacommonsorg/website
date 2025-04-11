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

import re

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import wait_for_text

# Regular expression for matching Japanese characters:
# Hiragana: \u3040-\u309F
# Katakana: \u30A0-\u30FF
# Common Kanji: \u4E00-\u9FAF (includes many Chinese characters used in Japanese)
JAPANESE_CHAR_PATTERN = re.compile(r'[\u3040-\u30FF\u4E00-\u9FAF]')


class PlaceI18nExplorerTestMixin():
  """Mixins to test the i18n place explorer page."""

  def test_demographics_link_in_fr(self):
    """Test the demographics link in FR propagates."""

    # Load France page.
    self.driver.get(self.url_ + '/place/country/FRA?hl=fr')
    # Find demographic link in explore topics box
    topics_for_fr = [
        "Économie", "Santé", "Capitaux propres", "Données démographiques",
        "Environnement", "Énergie"
    ]
    shared.assert_topics(self,
                         self.driver,
                         path_to_topics=['explore-topics-box'],
                         classname='item-list-item',
                         expected_topics=topics_for_fr)

    demographics = find_elem(
        self.driver,
        by=By.CSS_SELECTOR,
        value='.item-list-item[data-testid="Demographics"] a')
    demographics.click()
    self.driver.get(self.driver.current_url)

    # Wait until the new page has loaded and check for text
    wait_for_text(self.driver, "Données démographiques", By.CSS_SELECTOR,
                  'span[data-testid="place-name"]')

    # Assert that Demographics is part of the new url
    self.assertTrue("Demographics" in self.driver.current_url)
    self.assertTrue("&hl=fr" in self.driver.current_url)

  def test_explorer_redirect_place_explorer(self):
    """Test the redirection from explore to place explore for single place queries keeps the locale and query string"""
    usa_explore_fr_locale = '/explore?hl=fr#q=United%20States%20Of%20America'

    start_url = self.url_ + usa_explore_fr_locale
    self.driver.get(start_url)

    # Assert 200 HTTP code: successful page load.
    redirect_finished = EC.url_changes(start_url)
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(redirect_finished)
    self.assertEqual(shared.safe_url_open(self.driver.current_url), 200)

    # Wait for redirect and page load.
    shared.wait_for_loading(self.driver)

    # Assert redirected URL is correct and contains the locale and query string.
    self.assertTrue('place/country/USA?q=United+States+Of+America&hl=fr' in
                    self.driver.current_url)

    # Assert localized page title is correct for the locale.
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains('États-Unis'))

  def test_localized_place_page_title(self):
    """Test localized place page title is correct for the locale."""
    self.driver.get(self.url_ +
                    '/place/country/USA?hl=ja&category=Demographics')
    WebDriverWait(self.driver,
                  self.TIMEOUT_SEC).until(EC.title_contains('アメリカ合衆国 - 人口統計'))

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
    self.driver.get(self.url_ + '/place/africa?hl=fr')

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
        "Environnement", "Énergie"
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

  def test_japan_in_japanese(self):
    """Test translations from various sources are displayed correctly."""

    start_url = self.url_ + '/place/country/JPN?hl=ja'
    self.driver.get(start_url)

    wait_for_text(self.driver, '日本', By.CSS_SELECTOR,
                  '.place-info [data-testid="place-name"]')

    # Ensure that the place type in {parentPlace} is translated
    wait_for_text(self.driver, 'の 国', By.CSS_SELECTOR, '.place-info .subheader')

    # Ensure that the topics tab links are translated
    economics_link = find_elem(self.driver,
                               by=By.CSS_SELECTOR,
                               value=".explore-topics-box .item-list-item a")
    self.assertEqual(economics_link.text, "経済")

    # Ensure that the economics section is translated
    # The first block-title-text is the economics section
    wait_for_text(self.driver, '経済', By.CLASS_NAME, 'block-title-text')

    # Test that charts are present
    charts = self.driver.find_elements(By.CSS_SELECTOR, '.chart-container')
    self.assertGreater(len(charts), 0,
                       "Expected at least one chart to be present")

    # Wait for and scroll to ranking tile so it lazy loads
    ranking_tile = find_elem(self.driver,
                             by=By.CLASS_NAME,
                             value="ranking-tile")
    self.driver.execute_script("arguments[0].scrollIntoView();", ranking_tile)

    # Ensure the ranking tile footer text is translated
    self.assertEqual(
        find_elem(self.driver,
                  by=By.CSS_SELECTOR,
                  value=".chart-container .chart-footnote").text,
        "使用可能な最新のデータに基づくランキング。一部の地域は、対象の年の報告が不完全なため、欠落している可能性があります。")

    # Ranking tile place names load asynchronously, so wait for place name text to be non-empty
    WebDriverWait(
        self.driver, self.TIMEOUT_SEC).until(lambda driver: driver.find_element(
            By.CSS_SELECTOR, '.ranking-tile .place-name'
        ) and driver.find_element(By.CSS_SELECTOR, '.ranking-tile .place-name').
                                             text.strip() != '')
    # Assert that the 1st place name contains Japanese characters
    place_name = self.driver.find_element(By.CSS_SELECTOR,
                                          '.ranking-tile .place-name')
    self.assertTrue(JAPANESE_CHAR_PATTERN.search(place_name.text))

    # Wait for and scroll to the first bar chart tile so it lazy loads
    bar_chart_tile_present = EC.presence_of_element_located(
        (By.CLASS_NAME, "bar-chart"))
    bar_chart_tile = WebDriverWait(
        self.driver, self.TIMEOUT_SEC).until(bar_chart_tile_present)
    self.driver.execute_script("arguments[0].scrollIntoView();", bar_chart_tile)

    # Ensure that the bar chart's axis labels (localized place names) have japanese text
    self.assertTrue(
        JAPANESE_CHAR_PATTERN.search(
            find_elem(self.driver,
                      by=By.CSS_SELECTOR,
                      value="svg text.place-tick").text))

    # Ensure translated per capita checkbox is present
    self.assertEqual(
        find_elem(self.driver,
                  by=By.CSS_SELECTOR,
                  value=".block-controls [data-testid='see-per-capita']").text,
        "1 人あたりのデータを表示")

    # Test that related places callout is translated
    related_places = find_elem(self.driver,
                               by=By.CLASS_NAME,
                               value="related-places-callout")
    self.assertEqual(related_places.text, "日本 の地域")

    # Test that child place link is translated
    child_place_link = find_elem(self.driver,
                                 by=By.CSS_SELECTOR,
                                 value=".related-places .item-list-item a")
    self.assertEqual(child_place_link.text, "北海道")

    # Test that timeline links are removed
    self.assertListEqual(
        self.driver.find_elements(By.CLASS_NAME, 'explore-more'), [])
