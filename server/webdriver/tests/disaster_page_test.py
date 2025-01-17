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

from server.webdriver.base import WebdriverBaseTest
from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import wait_elem


class TestCharts(WebdriverBaseTest):
  """Class to test disaster page."""

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
    self.assertIsNotNone(
        wait_elem(self.driver, by=By.ID, value='subject-page-main-pane'))

    # Store a list of all the charts.
    event_maps = find_elems(self.driver, value='disaster-event-map-tile')
    self.assertGreater(len(event_maps), 5)

    # Wait until the svg loads in the first article.
    self.assertIsNotNone(find_elem(event_maps[0], by=By.TAG_NAME, value='svg'))

    # Assert first article has svg with map geo region.
    map_geo_region = find_elem(event_maps[0], by=By.ID, value='map-geo-regions')
    self.assertIsNotNone(map_geo_region)

    path = find_elems(map_geo_region, by=By.TAG_NAME, value='path')
    self.assertEqual(len(path), 1)

    # Assert first article has svg with at least 2 points.
    self.assertGreater(len(find_elems(event_maps[0], value='map-points-layer')),
                       2)
