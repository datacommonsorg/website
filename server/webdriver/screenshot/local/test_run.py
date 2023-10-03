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
import uuid

from server.webdriver.base import WebdriverBaseTest
from server.webdriver.screenshot import runner


def create_test_function(page_config):

  def test_function(self):
    runner.run(self.driver, self.url_, page_config)

  return test_function


page_configs = runner.prepare('local')

screenshot_url = {}

for page_config in page_configs:
  file_name = '{}.png'.format(uuid.uuid4().hex)
  page_config['file_name'] = file_name
  screenshot_url[file_name] = page_config['url']

with open("screenshots/screenshot_url.json", "w") as json_file:
  json.dump(screenshot_url, json_file)

test_functions = {
    f"test_{page}": create_test_function(page) for page in page_configs
}

TestDynamic = type("TestDynamic", (WebdriverBaseTest,), test_functions)
