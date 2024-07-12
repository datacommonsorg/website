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
"""Utilities used by the base webddriver test."""

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

DEFAULT_HEIGHT = 1200
DEFAULT_WIDTH = 1200


def create_driver(preferences=None):
  # These options are needed to run ChromeDriver inside a Docker without a UI.
  chrome_options = Options()
  chrome_options.add_argument('--headless=new')
  chrome_options.add_argument('--no-sandbox')
  chrome_options.add_argument('--disable-dev-shm-usage')
  chrome_options.add_argument('--hide-scrollbars')
  if preferences:
    chrome_options.add_experimental_option("prefs", preferences)
  driver = webdriver.Chrome(options=chrome_options, service=Service(port=0))
  # Set a reliable window size for all tests (can be overwritten though)
  driver.set_window_size(DEFAULT_WIDTH, DEFAULT_HEIGHT)
  return driver
