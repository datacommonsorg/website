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

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

LOADING_WAIT_TIME_SEC = 3
MAX_NUM_SPINNERS = 3
"""Common library for functions used by multiple webdriver tests"""


def wait_for_loading(driver):
  """
  Wait for loading spinners to appear then disappear. Sometimes, more
  than one spinner will appear and disappear, so wait for MAX_NUM_SPINNERS
  spinners to appear and disappear. Or finish waiting if it takes more than
  LOADING_WAIT_TIME_SEC seconds for the next spinner to appear.
  """
  screen_present = EC.visibility_of_element_located((By.ID, 'screen'))
  screen_hidden = EC.invisibility_of_element_located((By.ID, 'screen'))
  num_tries = 0
  while (num_tries < MAX_NUM_SPINNERS):
    try:
      WebDriverWait(driver, LOADING_WAIT_TIME_SEC).until(screen_present)
      WebDriverWait(driver, LOADING_WAIT_TIME_SEC).until(screen_hidden)
      num_tries += 1
    except:
      break


def click_sv_group(driver, svg_name):
  """In the stat var widget, click on the stat var group titled svg_name."""
  sv_groups = driver.find_elements_by_class_name('node-title')
  for group in sv_groups:
    if svg_name in group.text:
      group.click()
      break
