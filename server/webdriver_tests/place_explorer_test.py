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
from base_test import TestBase
import time


USA_URL = '/place?dcid=country/USA'


class TestPlaceExplorer(TestBase):

    def test_page_server(self):
        """Test the place explorer tool page cann be loaded successfullly."""
        self.driver.get(self.get_server_url() + USA_URL)
        time.sleep(5)
        req = urllib.request.Request(self.driver.current_url)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.getcode(), 200)
        self.assertEqual("United States | Place Explorer | Data Commons", self.driver.title)


if __name__ == '__main__':
    unittest.main()
