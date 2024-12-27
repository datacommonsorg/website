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
import time

from google.cloud import secretmanager
from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import UnexpectedAlertPresentException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared

WIDTH = 1280
SCREENSHOTS_FOLDER = 'screenshots'

WAIT_TIMEOUT = 40

_INSTANCE_WITH_IAP = [
    'https://autopush.datacommons.org', 'https://staging.datacommons.org'
]
_SECRET_PROJECT = 'datcom-ci'
_SECRET_NAME = 'webdriver-gmail-password'


def prepare(page_config_dir):
  for f in os.listdir(SCREENSHOTS_FOLDER):
    if f != '.gitkeep':
      try:
        os.remove(os.path.join(SCREENSHOTS_FOLDER, f))
      except FileNotFoundError:
        continue
  curr_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.join(curr_dir, page_config_dir)
  file_list = os.listdir(root_dir)
  all_page_config = []
  for fname in file_list:
    if fname.endswith('.json'):
      with open(os.path.join(root_dir, fname)) as f:
        page_config = json.load(f)
        all_page_config.extend(page_config)
  return all_page_config


# Google Sign In for IAP protected page
def login(driver):
  # Check if already login
  try:
    WebDriverWait(driver, 1).until(
        EC.presence_of_element_located(
            (By.XPATH, "//button[contains(., 'iap.googleapis.com')]")))
  except TimeoutException:
    return

  username_input = WebDriverWait(driver, 1).until(
      EC.presence_of_element_located((By.TAG_NAME, 'input')))
  username_input.send_keys("datacommons.webdriver@gmail.com")
  username_next_button = driver.find_element(By.XPATH,
                                             "//button[contains(., 'Next')]")
  driver.execute_script("arguments[0].click();", username_next_button)
  # Enter password
  secret_client = secretmanager.SecretManagerServiceClient()
  secret_name = secret_client.secret_version_path(_SECRET_PROJECT, _SECRET_NAME,
                                                  'latest')
  secret_response = secret_client.access_secret_version(name=secret_name)
  password = secret_response.payload.data.decode('UTF-8')
  password_input = WebDriverWait(driver, WAIT_TIMEOUT).until(
      EC.element_to_be_clickable((By.XPATH, "//input[@type='password']")))
  password_input.send_keys(password)
  password_next_button = driver.find_element(By.XPATH,
                                             "//button[contains(., 'Next')]")
  driver.execute_script("arguments[0].click();", password_next_button)


def run(driver, page_base_url, page_config):
  """Take screenshot and save to desired folders"""

  width = WIDTH
  if 'width' in page_config:
    width = page_config['width']

  # Set the window size. Testing different sizes.
  driver.set_window_size(width=width,
                         height=page_config['height'],
                         windowHandle='current')
  url = page_base_url + page_config['url']
  driver.get(url)

  if page_base_url in _INSTANCE_WITH_IAP:
    login(driver)

  # 'async' indicates whether this page fetches data or renders components
  # asyncronously. The web driver wait depends on it.
  if page_config['async']:
    shared.wait_for_loading(driver)
    try:
      WebDriverWait(driver, WAIT_TIMEOUT).until(shared.charts_rendered)
    except (TimeoutException, UnexpectedAlertPresentException) as e:
      logging.error("Exception for url: %s\n%s", url, e)
      raise e
  else:
    element_present = EC.presence_of_element_located((By.TAG_NAME, 'main'))
    WebDriverWait(driver, WAIT_TIMEOUT).until(element_present)
  # Extra sleep to make sure page element settles. For example, stat var
  # hierarchy widget expands via animation.
  time.sleep(1)
  file_name = page_config['file_name']
  tmp_file = '{}/{}'.format(SCREENSHOTS_FOLDER, file_name)
  if not driver.save_screenshot(tmp_file):
    raise Exception('Failed to save screenshot image for url: {}'.format(url))