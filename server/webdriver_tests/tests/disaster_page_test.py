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

import urllib.request

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver_tests.base_test import WebdriverBaseTest


# Class to test disaster page
class TestCharts(WebdriverBaseTest):

  def test_server_and_page(self):
    """Test the server can run successfully."""

    # Load disaster page for Brazil.
    self.driver.get(self.url_ + "/disasters/country/BRA")

    # Assert 200 HTTP code: successful page load.
    req = urllib.request.Request(self.driver.current_url)
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert 200 HTTP code: successful JS generation.
    req = urllib.request.Request(self.url_ + "/disaster_dashboard.js")
    with urllib.request.urlopen(req) as response:
      self.assertEqual(response.getcode(), 200)

    # Assert page title is correct.
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        EC.title_contains('Disasters Dashboard'))

    # Wait until the group of charts has loaded.
    element_present = EC.presence_of_element_located(
        (By.ID, 'subject-page-main-pane'))
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(element_present)

    # Store a list of all the charts.
    event_maps = self.driver.find_elements(By.CLASS_NAME,
                                           'disaster-event-map-tile')
    # Assert there are 5+ maps.
    self.assertGreater(len(event_maps), 5)

    # Wait until the svg loads in the first article.
    WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
        lambda d: event_maps[0].find_element(By.TAG_NAME, 'svg'))

    # Assert first article has svg with map geo region.
    map_geo_region = event_maps[0].find_element(By.ID, 'map-geo-regions')
    path = map_geo_region.find_elements(By.TAG_NAME, 'path')
    self.assertEqual(len(path), 1)

    # Assert first article has svg with points.
    map_points_layers = event_maps[0].find_elements(By.CLASS_NAME,
                                                    'map-points-layer')
    self.assertGreater(len(map_points_layers), 2)
