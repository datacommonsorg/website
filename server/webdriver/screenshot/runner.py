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
import logging
import os
import shutil
import time
import urllib.parse
import uuid

from PIL import Image
from PIL import PngImagePlugin
from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import UnexpectedAlertPresentException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared

# TODO(shifucun): add test for narrow width for mobile testing
WIDTH = 1280
SCREENSHOTS_FOLDER = 'screenshots'

timeout = 20


def prepare(page_config_dir):
  for f in os.listdir(SCREENSHOTS_FOLDER):
    if f != '.gitkeep':
      os.remove(os.path.join(SCREENSHOTS_FOLDER, f))
  curr_dir = os.path.dirname(os.path.abspath(__file__))
  with open(os.path.join(curr_dir, page_config_dir, 'page.json')) as f:
    page_config = json.load(f)
    return page_config


def run(driver, base_url, page):
  """Take screenshot and save to desired folders"""
  # Set the window size. Testing different sizes.
  driver.switch_to.new_window('window')
  driver.set_window_size(width=WIDTH,
                         height=page['height'],
                         windowHandle='current')
  url = base_url + page['url']
  driver.get(url)
  # 'async' indicates whether this page fetches data or renders components
  # asyncronously. The web driver wait depends on it.
  if page['async']:
    shared.wait_for_loading(driver)
    try:
      WebDriverWait(driver, timeout).until(shared.charts_rendered)
    except (TimeoutException, UnexpectedAlertPresentException) as e:
      logging.error("Exception for url: %s\n%s", page['url'], e)
      return False
  else:
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'main'))
    WebDriverWait(driver, timeout).until(element_present)
  # Extra sleep to make sure page element settles. For example, stat var
  # hierarchy widget expands via animation.
  time.sleep(1)
  # Take a screenshot of the page and save it.
  name = urllib.parse.quote_plus(page['url'].removeprefix('/'))
  # Cap file name otherwise it may exceed limit of file name length.
  file_name = '{}/{}.png'.format(SCREENSHOTS_FOLDER, name[0:240])
  tmp_file = '{}.png'.format(uuid.uuid4().hex)
  if not driver.save_screenshot(tmp_file):
    logging.error('Failed to save screenshot image for url: %s', page['url'])
    return False
  img = Image.open(tmp_file)
  meta = PngImagePlugin.PngInfo()
  meta.add_text('url', page['url'])  # Add key-value pair
  img.save(tmp_file, pnginfo=meta)
  shutil.move(tmp_file, file_name)
  return True