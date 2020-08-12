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
from base_test import WebdriverBaseTest
 
TIMELINE_URL = '/tools/timeline'
URL_HASH_1 = '#&statsVar=Median_Age_Person,0,1__Median_Income_Person,0,2__Count_Person_Upto5Years,'\
    '0,3,0__Count_Person_5To17Years,0,3,1&place=geoId/06,geoId/08'
GEO_URL_1 = '#&place=geoId/06'



# Class to test timeline tool.
class TestCharts(WebdriverBaseTest):

    def test_server_and_page(self):
        """Test the server can run successfully."""
        self.driver.get(self.url_ + TIMELINE_URL)
        # Using implicit wait here to wait for loading page.
        self.driver.implicitly_wait(5)
        req = urllib.request.Request(self.driver.current_url)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.getcode(), 200)
        # Assert the js files are generated successfully.
        req = urllib.request.Request(self.url_ + "/timeline.js")
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.getcode(), 200)
        self.assertEqual("Timelines Explorer | Data Commons", self.driver.title)

    def test_charts_original(self):
        """Test the original timeline page. No charts in this page."""
        self.driver.get(self.url_ + TIMELINE_URL)
        self.driver.implicitly_wait(5)
        charts = self.driver.find_elements_by_class_name("card")
        self.assertEqual(len(charts), 0)

    def test_charts_from_url_directly_and_uncheck_statvar(self):
        """
        Given the url directly, test the menu and charts are shown correctly.
        Then unclick one statvar, test the corresponding change.
        """
        self.driver.get(self.url_ + TIMELINE_URL + URL_HASH_1)
        self.driver.implicitly_wait(5)
        charts = self.driver.find_elements_by_class_name("card")
        # Assert there are three charts.
        self.assertEqual(len(charts), 3)
        
        # Uncheck median age statvar, and the number of charts will become two.
        median_age = self.driver.find_element_by_id("Median age")
        median_age_checkbox = median_age.find_element_by_class_name("checked")
        median_age_checkbox.click()
        self.driver.implicitly_wait(2)
        charts = self.driver.find_elements_by_class_name("card")
        # Assert there are two charts.
        self.assertEqual(len(charts), 2)

    def test_check_statvar_and_uncheck(self):
        """Test check and uncheck one statvar."""
        self.driver.get(self.url_ + TIMELINE_URL + GEO_URL_1)
        self.driver.implicitly_wait(3)
        charts = self.driver.find_elements_by_class_name("card")
        # Assert there is no chart.
        self.assertEqual(len(charts), 0)

        # Explore the menu and check the population box.
        elem = self.driver.find_element_by_id("Demographics")
        caret = elem.find_element_by_class_name("right-caret")
        caret.click()
        self.driver.implicitly_wait(2)
        population = elem.find_element_by_id("Population")
        population_checkbox = population.find_element_by_class_name("checkbox")
        population_checkbox.click()
        self.driver.implicitly_wait(5)
        charts = self.driver.find_elements_by_class_name("card")
        # Assert there is one chart.
        self.assertEqual(len(charts), 1)

if __name__ == '__main__':
    unittest.main()
