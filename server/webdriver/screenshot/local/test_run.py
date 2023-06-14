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


# Class to test screenshot capture.
class Test(WebdriverBaseTest):

  def test_run_local(self):
    """Test these page can show correctly and do screenshot."""
    self.assertTrue(runner.run(self.driver, self.url_))
