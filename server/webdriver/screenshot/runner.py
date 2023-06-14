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

import json
import os
import urllib.parse

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared

# TODO(shifucun): add test for narrow width for mobile testing
WIDTH = 1280
SCREENSHOTS_FOLDER = 'screenshots'


def run(driver, base_url, page_config_dir):
  """Take screenshot and save to desired folders"""
  for f in os.listdir(SCREENSHOTS_FOLDER):
    if f != '.gitkeep':
      os.remove(os.path.join(SCREENSHOTS_FOLDER, f))
  curr_dir = os.path.dirname(os.path.abspath(__file__))
  with open(os.path.join(curr_dir, page_config_dir, 'page.json')) as f:
    config = json.load(f)
    for page in config:
      # Set the window size. Testing different sizes.
      driver.set_window_size(width=WIDTH,
                             height=page['height'],
                             windowHandle='current')
      driver.get(base_url + page['url'])
      if page['async']:
        WebDriverWait(driver, shared.TIMEOUT).until(shared.charts_rendered)
      else:
        element_present = EC.presence_of_element_located((By.TAG_NAME, 'main'))
        WebDriverWait(driver, shared.TIMEOUT).until(element_present)
      # Take a screenshot of the page and save it.
      name = urllib.parse.quote_plus(page['url'].removeprefix('/'))
      file_name = '{}/{}.png'.format(SCREENSHOTS_FOLDER, name)
      if not driver.save_screenshot(file_name):
        return False
  return True