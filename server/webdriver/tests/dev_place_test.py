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

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base import WebdriverBaseTest


class TestDevPlacePage(WebdriverBaseTest):
  """Tests for (new) Place page."""

  def test_dev_place_overview_usa(self):
    """Ensure place page content loads"""
    self.driver.get(self.url_ + '/dev-place/geoId/06')

    # Wait until the related places container has loaded
    related_places_callout_el_present = EC.presence_of_element_located(
        (By.CLASS_NAME, 'related-places-callout'))
    related_places_callout_el = WebDriverWait(
        self.driver, self.TIMEOUT_SEC).until(related_places_callout_el_present)
    self.assertEqual(related_places_callout_el.text, 'Places in California')
