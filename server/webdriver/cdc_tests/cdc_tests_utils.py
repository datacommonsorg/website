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
"""
This file includes utility methods for CDC webdriver tests.
"""

from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


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
