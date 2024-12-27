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

import json
import unittest
from unittest import mock

from web_app import app


class TestVariablePath(unittest.TestCase):

  @mock.patch('server.routes.shared_api.variable.dc.get_variable_ancestors')
  def test_variable_path(self, mock_result):

    def side_effect(dcid):
      if dcid == "Count_Person":
        return ["dc/g/Demographics"]
      else:
        return {}

    mock_result.side_effect = side_effect
    response = app.test_client().get('api/variable/path?dcid=Count_Person')
    assert response.status_code == 200
    result = json.loads(response.data)
    assert result == ["Count_Person", "dc/g/Demographics"]
