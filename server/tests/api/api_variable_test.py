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

from main import app


class TestVariablePath(unittest.TestCase):

  @mock.patch('routes.api.variable.dc.get')
  def test_variable_path(self, mock_result):

    def side_effect(url):
      if url.endswith("/v1/variable/ancestors/Count_Person"):
        return {"ancestors": ["dc/g/Demographics"]}
      else:
        return {}

    mock_result.side_effect = side_effect
    response = app.test_client().get('api/variable/path?dcid=Count_Person')
    assert response.status_code == 200
    result = json.loads(response.data)
    assert result == ["Count_Person", "dc/g/Demographics"]
