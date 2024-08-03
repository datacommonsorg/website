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
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

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
  try:
    print("before creating driver")
    driver = webdriver.Chrome(options=chrome_options)
    print("after creating driver")
  except Exception as e:
    print("caught exception")
    print(str(e))


  # Set a reliable window size for all tests (can be overwritten though)
  driver.set_window_size(DEFAULT_WIDTH, DEFAULT_HEIGHT)
  return driver


def find_elem(parent, by: str, value: str):
  """
  Finds an element within the parent element with the specified by string and value.
  Returns None if not found.
  """
  try:
    return parent.find_element(by, value)
  except:
    return None


def find_elems(parent, by: str, value: str):
  """
  Finds elements within the parent element with the specified by string and value.
  Returns None if not found.
  """
  try:
    return parent.find_elements(by, value)
  except:
    return None


def wait_elem(driver, by: str, value: str, timeout_seconds: float = 5):
  """
  Waits for an element within the parent element with the specified by string and value.
  Uses a default timeout of 5 seconds.
  Returns None if not found.
  """
  try:
    return WebDriverWait(driver, timeout_seconds).until(
        EC.presence_of_element_located((by, value)))
  except:
    return None
