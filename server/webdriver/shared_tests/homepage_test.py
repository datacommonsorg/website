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
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

class HomepageTestMixin():
    """Mixins to test the homepage."""

    def test_homepage_en(self):
        """Test homepage in EN."""
        self.driver.get(self.url_ + '/')

        # Assert page title is correct
        WebDriverWait(self.driver, self.TIMEOUT_SEC).until(
            EC.title_contains(self.DATACOMMONS_STRING))
        self.assertIn("- " + self.DATACOMMONS_STRING, self.driver.title)
