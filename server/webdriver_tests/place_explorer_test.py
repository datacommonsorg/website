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

import unittest
import urllib
from webdriver_tests.base_test import WebdriverBaseTest


USA_URL = '/place?dcid=country/USA'


# Class to test place explorer tool.
class TestPlaceExplorer(WebdriverBaseTest):

    def test_page_serve(self):
        """Test the place explorer tool page cann be loaded successfullly."""
        self.driver.get(self.url_ + USA_URL)
        # Using implicit wait here to wait for loading page.
        self.driver.implicitly_wait(5)
        req = urllib.request.Request(self.driver.current_url)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.getcode(), 200)
        # Assert the js files are generated successfully.
        req = urllib.request.Request(self.url_ + "/place.js")
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.getcode(), 200)
        self.assertEqual("United States | Place Explorer | Data Commons", self.driver.title)


if __name__ == '__main__':
    unittest.main()
