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


class TestStaticPage(unittest.TestCase):

  def test_browser_static(self):
    response = app.test_client().get('/browser/')
    assert response.status_code == 200
    assert b"The Data Commons Graph is constructed by" in response.data

  @patch('server.routes.api.shared.names')
  def test_browser_node(self, mock_names):
    dcid = 'geoId/06'
    mock_names.return_value = {dcid: 'California'}
    response = app.test_client().get('/browser/' + dcid)
    assert response.status_code == 200
    assert b"geoId/06" in response.data
