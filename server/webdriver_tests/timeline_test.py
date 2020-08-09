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
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
import time
from base_test import TestBase
from main import app

TOOL_URL = '/tools/timeline'

class TestCharts(TestBase):

    def test_server_and_page(self):
        """
        Test the server can run successfully.
        """
        self.driver.get(self.get_server_url() + TOOL_URL)
        time.sleep(5)
        response = urllib.request.urlopen(self.driver.current_url)
        self.assertEqual(response.getcode(), 200)
        self.assertEqual("Timelines Explorer | Data Commons", self.driver.title)

    def test_charts_original(self):
        """
        Test the original timeline page. No charts in this page.
        """
        self.driver.get(self.get_server_url() + TOOL_URL)
        time.sleep(5)
        responses = []
        responses = self.driver.find_elements_by_class_name("card")
        self.assertEqual(len(responses), 0)


if __name__ == '__main__':
    unittest.main()
