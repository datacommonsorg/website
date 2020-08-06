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

from flask_testing import LiveServerTestCase
from selenium import webdriver
import logging
import time

from main import app


class TestBase(LiveServerTestCase):

    def create_app(self):
        return app

    def setUp(self):
        """
        Will be called before every test
        """
        chrome_options = webdriver.ChromeOptions()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        self.driver = webdriver.Chrome(options=chrome_options)

        # self.driver = webdriver.Chrome()

        self.driver.get('http://datacommons.org/tools/timeline')
        # self.driver.get(self.get_server_url() + '/tools/timeline')

    def tearDown(self):
        self.driver.quit()


class TestCharts(TestBase):

    def test_server_and_page(self):
        """
        Test the server can run successfully.
        """

        response = urllib.request.urlopen(self.driver.current_url)
        self.assertEqual(response.getcode(), 200)
        self.assertEqual("Timelines Explorer | Data Commons", self.driver.title)

    def test_charts_original(self):
        """
        Test the original timeline page. No charts in this page.
        """
        response = urllib.request.urlopen(self.driver.current_url)
        time.sleep(5)
        self.assertEqual(response.getcode(), 200)
        self.assertEqual("Timelines Explorer | Data Commons", self.driver.title)
        responses = []
        responses = self.driver.find_elements_by_class_name("card")
        self.assertEqual(len(responses), 0)

    def test_chart_numbers_1(self):
        self.driver.get(self.driver.current_url + '#&statsVar=Median_Age_Person,0,1__Median_Income_Person,0,2&place=geoId/06')

        time.sleep(5)
        # TODO: Leave screenshot in future PR.
        # self.driver.save_screenshot("test_screenshots/timeline_ca_2_charts.png")
        response = urllib.request.urlopen(self.driver.current_url)
        self.assertEqual(response.getcode(), 200)
        self.assertEqual("Timelines Explorer | Data Commons", self.driver.title)
        responses = []
        responses = self.driver.find_elements_by_class_name("card")
        self.assertEqual(len(responses), 2)

    def test_chart_numbers_2(self):
        self.driver.get(self.driver.current_url + '#&statsVar=Median_Age_Person,0,1__Median_Income_Person,0,2__Count_Person_Upto5Years,0,3,0__Count_Person_5To17Years,0,3,1&place=geoId/06,geoId/08')
        time.sleep(5)
        # TODO: Leave screenshot in future PR.
        # self.driver.save_screenshot("test_screenshots/timeline_ca_co_3_charts.png")
        response = urllib.request.urlopen(self.driver.current_url)
        self.assertEqual(response.getcode(), 200)
        self.assertEqual("Timelines Explorer | Data Commons", self.driver.title)
        responses = []
        responses = self.driver.find_elements_by_class_name("card")
        self.assertEqual(len(responses), 3)


if __name__ == '__main__':
    unittest.main()
