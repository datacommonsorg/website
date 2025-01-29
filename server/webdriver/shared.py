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
"""Common library for functions used by multiple webdriver tests"""

import urllib
import urllib.request

from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import TIMEOUT

LOADING_WAIT_TIME_SEC = 3
MAX_NUM_SPINNERS = 3
ASYNC_ELEMENT_HOLDER_CLASS = 'dc-async-element-holder'
ASYNC_ELEMENT_CLASS = 'dc-async-element'

# Keep in sync with the web component definitions at static/library/*component.ts
# and packages/web-components/src/main.ts
WEB_COMPONENT_TAG_NAMES = [
    'datacommons-bar', 'datacommons-gauge', 'datacommons-highlight',
    'datacommons-line', 'datacommons-map', 'datacommons-pie',
    'datacommons-ranking', 'datacommons-slider', 'datacommons-text',
    'datacommons-scatter'
]


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
  sv_groups = driver.find_elements(By.CLASS_NAME, 'node-title')
  for group in sv_groups:
    if svg_name in group.text:
      group.click()
      break


def click_el(driver, element_locator):
  """Waits for an element with the given locator to be clickable, then clicks it.

  Returns the clicked element.
  """
  element_clickable = EC.element_to_be_clickable(element_locator)
  WebDriverWait(driver, TIMEOUT).until(element_clickable)
  element = driver.find_element(*element_locator)
  element.click()
  return element


def select_source(driver, source_name, sv_dcid):
  """With the source selector modal open, choose the source with name
    source_name for variable with dcid sv_dcid"""
  wait_for_loading(driver)
  source_options = driver.find_elements(By.NAME, sv_dcid)
  for option in source_options:
    parent = option.find_element(By.XPATH, '..')
    if source_name in parent.text:
      option.click()
      wait_for_loading(driver)
      break


def charts_rendered(driver):
  """
  Wait asynchronously for charts or web components to show up
  """
  web_component_element_present = EC.any_of(*[
      EC.presence_of_element_located((By.TAG_NAME, tag_name))
      for tag_name in WEB_COMPONENT_TAG_NAMES
  ])
  chart_element_present = EC.presence_of_element_located(
      (By.CLASS_NAME, ASYNC_ELEMENT_HOLDER_CLASS))
  WebDriverWait(driver, TIMEOUT).until(
      EC.any_of(chart_element_present, web_component_element_present))

  # Ensure chart tiles were rendered properly
  chart_containers = driver.find_elements(By.CLASS_NAME,
                                          ASYNC_ELEMENT_HOLDER_CLASS)
  for c in chart_containers:
    try:
      c.find_element(By.CLASS_NAME, ASYNC_ELEMENT_CLASS)
    except NoSuchElementException:
      return False

  # Ensure web components have an "id" attribute
  web_component_containers = driver.find_elements(
      By.CSS_SELECTOR, ", ".join(WEB_COMPONENT_TAG_NAMES))
  for wc in list(web_component_containers):
    dom_id = wc.get_attribute("id")
    if not dom_id:
      return False
  return True


def safe_url_open(url):
  """Execute urlopen and assert success."""
  if not url.lower().startswith('http'):
    raise ValueError(f'Invalid scheme in {url}. Expected http(s)://.')

  req = urllib.request.Request(url)
  if url.startswith('http'):
    with urllib.request.urlopen(req) as response:  # nosec B310
      return response.getcode()
  return 0


def assert_topics(self, driver, path_to_topics, classname, expected_topics):
  """Assert the topics on the place page."""
  item_list_items = find_elems(driver,
                               by=By.CLASS_NAME,
                               value=classname,
                               path_to_elem=path_to_topics)

  # Assert that the number of found elements matches the expected number
  self.assertEqual(len(item_list_items), len(expected_topics))

  # Iterate through the elements and assert their text content
  for item, expected_text in zip(item_list_items, expected_topics):
    self.assertEqual(item.text, expected_text)
