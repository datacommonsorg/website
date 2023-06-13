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

import multiprocessing
import sys

from flask_testing import LiveServerTestCase
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

from server.webdriver import shared
from web_app import app

# Explicitly set multiprocessing start method to 'fork' so tests work with
# python3.8+ on MacOS.
# https://docs.python.org/3/library/multiprocessing.html#contexts-and-start-methods
# This code must only be run once per execution.
if sys.version_info >= (3, 8) and sys.platform == "darwin":
  multiprocessing.set_start_method("fork")

DEFAULT_HEIGHT = 1200
DEFAULT_WIDTH = 1200


def create_driver():
  # These options are needed to run ChromeDriver inside a Docker without a UI.
  chrome_options = Options()
  # chrome_options.add_argument('--headless=new')
  chrome_options.add_argument('--no-sandbox')
  chrome_options.add_argument('--disable-dev-shm-usage')
  driver = webdriver.Chrome(options=chrome_options)
  # Set a reliable window size for all tests (can be overwritten though)
  driver.set_window_size(DEFAULT_WIDTH, DEFAULT_HEIGHT)
  return driver


# Base test class to setup the server.
# Please refer to README.md to see the order of method execution during test.
class WebdriverBaseTest(LiveServerTestCase):

  def create_app(self):
    """Returns the Flask Server running Data Commons."""
    app_instance = app
    # Each test will start its own Flask Server.
    # Port 0 is used to let Flask pick any available port.
    # If no port is specified, port 5000 will be used for all tests which
    # may cause some racing issue when running tests.
    app_instance.config['LIVESERVER_PORT'] = 0
    return app_instance

  def setUp(self):
    """Runs at the beginning of every individual test."""
    # Maximum time, in seconds, before throwing a TimeoutException.
    self.TIMEOUT_SEC = shared.TIMEOUT
    self.driver = create_driver()
    # The URL of the Data Commons server.
    self.url_ = self.get_server_url()

  def tearDown(self):
    """Runs at the end of every individual test."""
    # Quit the ChromeDriver instance.
    # NOTE: Every individual test starts a new ChromeDriver instance.
    self.driver.quit()
