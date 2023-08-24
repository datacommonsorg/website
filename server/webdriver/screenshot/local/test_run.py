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

from server.webdriver.base import WebdriverBaseTest
from server.webdriver.screenshot import runner


def create_test_function(page_config):

  def test_function(self):
    assert runner.run(self.driver, self.url_, page_config)

  return test_function


test_functions = {
    f"test_{page}": create_test_function(page)
    for page in runner.prepare('local')
}

TestDynamic = type("TestDynamic", (WebdriverBaseTest,), test_functions)
