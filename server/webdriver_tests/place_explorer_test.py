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

from flask import abort, url_for
from flask_testing import LiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
import logging
import time

from main import app


USA_URL = '/place?dcid=country/USA'
USA_DEMOGRAPHICS_URL = '/place?dcid=country/USA&topic=Demographics'

class TestBase(LiveServerTestCase):

    def create_app(self):
        return app

    def setUp(self):
        """
        Will be called before every test
        """
        self.driver = webdriver.Chrome()
        self.driver.get(self.get_server_url() + USA_URL)

    def tearDown(self):
        self.driver.quit()

    def test_page_server(self):
        response = urllib.request.urlopen(self.get_server_url())
        self.assertEqual(response.getcode(), 200)
        self.assertEqual("United States | Place Explorer | Data Commons", self.driver.title)


class TestPlaceExplorer(TestBase):

    def test_explorer_original(self):
        time.sleep(3)
        self.assertEqual("United States | Place Explorer | Data Commons", self.driver.title)
        responses = []
        responses = self.driver.find_elements_by_class_name("chart-container")
        self.assertEqual(len(responses), 23)

    def test_more_charts_click(self):
        time.sleep(5)
        elem = self.driver.find_element_by_xpath("/html/body/div[1]/main/div/div/div[2]/div[3]/section[1]/h3/a")
        elem.click()
        time.sleep(5)
        self.assertEqual(self.driver.current_url, self.get_server_url() + USA_DEMOGRAPHICS_URL)
        

if __name__ == '__main__':
    unittest.main()
