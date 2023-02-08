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
from unittest.mock import patch

from web_app import app


class TestRoute(unittest.TestCase):

  def test_dev(self):
    response = app.test_client().get('/dev/')
    assert response.status_code == 200

  @patch('server.routes.dev.list_png')
  def test_screenshot(self, mock_list_png):
    mock_list_png.side_effect = (lambda bucket, prefix: [])
    response = app.test_client().get('/dev/screenshot/folder')
    assert response.status_code == 200
