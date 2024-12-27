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

import unittest
from unittest.mock import patch

from web_app import app


class TestRoute(unittest.TestCase):

  @patch('server.routes.screenshot.html.list_png')
  def test_commit_page(self, mock_list_png):
    mock_list_png.side_effect = (lambda bucket, prefix: {})
    response = app.test_client().get('/screenshot/commit/hash')
    assert response.status_code == 200

  @patch('server.routes.screenshot.html.list_png')
  def test_compare_page(self, mock_list_png):
    mock_list_png.side_effect = (lambda bucket, prefix: {})
    response = app.test_client().get('/screenshot/compare/hash1...hash2')
    assert response.status_code == 200
    response = app.test_client().get('/screenshot/compare/hash1')
    assert response.status_code == 400