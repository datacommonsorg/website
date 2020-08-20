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
from webdriver_tests.base_test import WebdriverBaseTest
from selenium.webdriver.support.ui import Select
import time


SCATTER_URL = '/scatter'


# Class to test timeline tool.
class TestScatter(WebdriverBaseTest):

    def test_server_and_page(self):
        """Test the server can run successfully."""
        self.driver.get(self.url_ + SCATTER_URL)
        # Using implicit wait here to wait for loading page.
        self.driver.implicitly_wait(3)
        self.assertEqual("Scatterplot tool | Data Commons", self.driver.title)

    def test_choosing_ptpvs_and_parameters_to_draw(self):
        """Test the scatter plot tool."""
        self.driver.get(self.url_ + SCATTER_URL)
        # Using implicit wait here to wait for loading page.
        self.driver.implicitly_wait(3)

        # Choose ptpvs
        demographics = self.driver.find_element_by_id("Demographics")
        demographics.find_element_by_class_name("expand-link").click()
        expanded_menu = self.driver.find_element_by_class_name("unordered-list")
        expanded_menu.find_element_by_id("checkbox-Person,count").click()
        expanded_menu.find_element_by_id("checkbox-Person,age").click()

        # Choose parameters.
        selects = Select(self.driver.find_element_by_id("place-types"))
        selects.select_by_value("CensusCoreBasedStatisticalArea")
        time.sleep(3)

        # Assert there is a chart showing up.
        chart_div = self.driver.find_element_by_id("chart-div")
        chart = chart_div.find_elements_by_tag_name("svg")
        self.assertEqual(len(chart), 1)
        circles = chart[0].find_elements_by_tag_name("circle")
        self.assertGreater(len(circles), 20)


if __name__ == '__main__':
    unittest.main()
