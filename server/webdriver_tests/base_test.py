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

from flask_testing import LiveServerTestCase
from selenium import webdriver
from main import app


# Base test class to setup the server.
class WebdriverBaseTest(LiveServerTestCase):

    @classmethod
    def setUpClass(cls):
        cls.port = 12345
        super(WebdriverBaseTest, cls).setUpClass()

    def create_app(self):
        return app

    def setUp(self):
        """Will be called before every test"""
        chrome_options = webdriver.ChromeOptions()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        self.driver = webdriver.Chrome(options=chrome_options)
        self.url_ = self.get_server_url()

    def tearDown(self):
        self.driver.quit()
