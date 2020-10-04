# Copyright 2020 Google LLC
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

import unittest
import urllib
from webdriver_tests.base_test import WebdriverBaseTest
from selenium.webdriver.support.ui import Select
import time

MTV_URL = '/place?dcid=geoId/0649670'
USA_URL = '/place?dcid=country/USA'
CA_URL = '/place?dcid=geoId/06'
PLACE_SEARCH = 'California, USA'


# Class to test place explorer tool.
class TestPlaceExplorer(WebdriverBaseTest):

    def test_page_serve_usa(self):
        """Test the place explorer page for USA can be loaded successfullly."""
        self.driver.get(self.url_ + USA_URL)
        # Wait for the XHR's to complete.
        time.sleep(5)
        req = urllib.request.Request(self.driver.current_url)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.getcode(), 200)
        # Assert the js files are generated successfully.
        req = urllib.request.Request(self.url_ + "/place.js")
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.getcode(), 200)
        self.assertEqual("United States | Place Explorer | Data Commons",
                         self.driver.title)
        title = self.driver.find_element_by_id("place-name")
        self.assertEqual("United States", title.text)
        subtitle = self.driver.find_element_by_id("place-type")
        self.assertEqual("A Country in North America", subtitle.text)

    def test_page_serve_mtv(self):
        """Test the place explorer page for MTV can be loaded successfullly."""
        self.driver.get(self.url_ + MTV_URL)
        time.sleep(5)
        self.assertEqual("Mountain View | Place Explorer | Data Commons",
                         self.driver.title)
        title = self.driver.find_element_by_id("place-name")
        self.assertEqual("Mountain View", title.text)
        subtitle = self.driver.find_element_by_id("place-type")
        self.assertEqual(
            "A City in Santa Clara County, California, United States of America, North America",
            subtitle.text)

    def test_place_search(self):
        """Test the place search box can work correctly."""
        self.driver.get(self.url_ + USA_URL)
        # Using implicit wait here to wait for loading page.
        self.driver.implicitly_wait(10)
        search_box = self.driver.find_element_by_class_name("pac-target-input")
        search_box.send_keys(PLACE_SEARCH)
        self.driver.implicitly_wait(10)
        search_results = self.driver.find_elements_by_class_name("pac-item")
        ca_result = search_results[0]
        ca_result.click()
        time.sleep(3)
        self.assertEqual("California | Place Explorer | Data Commons",
                         self.driver.title)

    def test_demographics_link(self):
        """
        Test the demographics link can work correctly.
        """
        self.driver.get(self.url_ + CA_URL)
        time.sleep(5)
        demographics = self.driver.find_element_by_id("Demographics")
        demographics.find_element_by_tag_name('a').click()
        time.sleep(5)
        self.assertTrue("Demographics" in self.driver.current_url)
        subtopics = self.driver.find_elements_by_class_name("subtopic")
        age_topic = subtopics[3]
        age_charts = age_topic.find_elements_by_class_name("col")
        age_across_places_chart = age_charts[1]
        chart_title = age_across_places_chart.find_element_by_tag_name(
            "h4").text
        self.assertEqual("Median Age by Gender: states near California(2018)",
                         chart_title, chart_title)


if __name__ == '__main__':
    unittest.main()
