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
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver.base_utils import find_elem
from server.webdriver.base_utils import find_elems
from server.webdriver.base_utils import TIMEOUT
from server.webdriver.base_utils import wait_elem

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

PLACE_SEARCH_CA = 'California'


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
  xpath_selector = f"//div[contains(@class, 'node-title') and .//*[contains(text(), '{svg_name}')]]"
  click_el(driver, (By.XPATH, xpath_selector))


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


def search_for_places(self,
                      driver,
                      search_term,
                      place_type,
                      is_new_vis_tools=True):
  if is_new_vis_tools:
    _search_for_places(self, driver, search_term, place_type)
  else:
    _search_for_places_old(self, driver, search_term, place_type)


def _search_for_places_old(self, driver, search_term, place_type):
  # Type term into the search box.
  search_box_input = find_elem(driver, by=By.ID, value='ac')
  search_box_input.send_keys(search_term)

  # Wait until there is at least one result in autocomplete results.
  self.assertIsNotNone(wait_elem(driver, value='pac-item'))

  # Click on the first result.
  click_el(driver, (By.CSS_SELECTOR, '.pac-item:nth-child(1)'))
  wait_for_loading(driver)
  self.assertIsNotNone(wait_elem(driver, value='chip'))

  # Choose place type
  place_selector_place_type = find_elem(driver,
                                        by=By.ID,
                                        value='place-selector-place-type')
  Select(place_selector_place_type).select_by_value(place_type)
  wait_for_loading(driver)


def _search_for_places(self, driver, search_term, place_type):
  # Click start
  click_el(driver, (By.CLASS_NAME, 'start-button'))

  # Type term into the search box.
  wait_elem(self.driver, by=By.ID, value='location-field')
  search_box_input = self.driver.find_element(By.ID, 'ac')
  search_box_input.send_keys(search_term)

  # Wait until there is at least one result in autocomplete results.
  self.assertIsNotNone(wait_elem(driver, value='pac-item'))

  # Click on the first result.
  click_el(driver, (By.CSS_SELECTOR, '.pac-item:nth-child(1)'))
  wait_for_loading(driver)

  # Click continue
  click_el(driver, (By.CLASS_NAME, 'continue-button'))

  # Wait for place types to load and click on one
  wait_elem(self.driver,
            by=By.CSS_SELECTOR,
            value='.place-type-selector .form-check-input')
  # Find the specific label by its text using XPath and click it
  place_type_xpath = f"//*[contains(@class, 'place-type-selector')]//label[text()='{place_type}']"
  click_el(driver, (By.XPATH, place_type_xpath))

  # Click continue
  click_el(driver, (By.CLASS_NAME, 'continue-button'))
  wait_for_loading(self.driver)
