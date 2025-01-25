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

from typing import List

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from server.webdriver import shared

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
  driver = webdriver.Chrome(options=chrome_options)
  # Set a reliable window size for all tests (can be overwritten though)
  driver.set_window_size(DEFAULT_WIDTH, DEFAULT_HEIGHT)
  return driver


def find_parents(parents,
                 by: str = By.CLASS_NAME,
                 parent_path: List[str] = None
                ) -> list[webdriver.remote.webelement.WebElement]:
  """
    Returns the final list of elements matching the 'by' in parent_path, waits for elements if needed.
    Note that we only return the elements matching all the way to the last parent_path value.
    For example:
      <div id=block>
        <div id=chart />
        <div id=chart />
      </div>
      <div id=block>
        <div id=chart />
        <div id=chart />
      </div>
    For find_parents(driver, By.ID, ['block', 'chart']) --> returns all 4 chart elements within the blocks. 
    """
  if not parent_path:
    return parents

  elements_to_return = []
  for value in parent_path:
    this_level_elements = []
    for par in parents:
      this_level_elements.extend(find_elems(par, by, value))
    elements_to_return = this_level_elements

  return elements_to_return


def find_elems(
    parent: webdriver.remote.webelement.WebElement,
    by: str = By.CLASS_NAME,
    value: str = "",
    path_to_elem: List[str] = None
) -> list[webdriver.remote.webelement.WebElement]:
  """
    Finds elements within the parent elements with the specified by string and value.
    If not found, it will wait up to the timeout set, and then return None.
    """
  parents = find_parents([parent], by,
                         path_to_elem) if path_to_elem else [parent]

  elements = []
  for par in parents:
    wait_elem(par, by, value, shared.TIMEOUT)
    found_elements = par.find_elements(by, value)
    if found_elements:
      elements.extend(found_elements)
    else:
      elems_or_none = wait_elem(par, by, value, shared.TIMEOUT)
      if elems_or_none:
        elements.append(elems_or_none)
  return elements if elements else []


def find_elem(
    parent: webdriver.remote.webelement.WebElement,
    by: str = By.CLASS_NAME,
    value: str = "",
    path_to_elem: List[str] = None
) -> webdriver.remote.webelement.WebElement | None:
  """
  Finds an element within the parent element with the specified by string and value.
  If not found, it will wait up to the timeout set, and then return None.
  """
  elems = find_elems(parent, by, value, path_to_elem)
  return elems[0] if elems else None


def scroll_to_elem(
    parent: webdriver.remote.webelement.WebElement,
    by: str = By.CLASS_NAME,
    value: str = "",
    path_to_elem: List[str] = None
) -> webdriver.remote.webelement.WebElement | None:
  """
  Scrolls to the element specified by By attribute and value. Waits for it to load if needed.
  Returns the element it scrolled to.
  """
  elem_to_scroll_to = find_elem(parent, by, value, path_to_elem)
  if not elem_to_scroll_to:
    return None

  parent.execute_script("arguments[0].scrollIntoView();", elem_to_scroll_to)
  return elem_to_scroll_to


def wait_elem(driver,
              by: str = By.CLASS_NAME,
              value: str = "",
              timeout_seconds: float = 5):
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
