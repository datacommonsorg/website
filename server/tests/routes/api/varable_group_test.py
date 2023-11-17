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


class TestGetVariableGroupInfo(unittest.TestCase):

  @mock.patch(
      'server.routes.shared_api.variable_group.dc.get_variable_group_info')
  def test_statvar_path(self, mock_result):
    expected_result = {
        "absoluteName":
            "Data Commons Variables",
        "childStatVarGroups": [{
            "id": "dc/g/Crime",
            "specializedEntity": "Crime",
            "displayName": "Crime"
        }, {
            "id": "dc/g/Demographics",
            "specializedEntity": "Demographics",
            "displayName": "Demographics"
        }]
    }

    def side_effect(dcids, entities, numEntitiesExistence):
      if dcids == ["dc/g/Root"] and entities == ["geoId/06"
                                                ] and numEntitiesExistence == 1:
        return {"data": [{"node": "dc/g/Root", "info": expected_result}]}
      else:
        return {}

    mock_result.side_effect = side_effect
    response = app.test_client().get(
        '/api/variable-group/info?dcid=dc/g/Root&entities=geoId/06')
    assert response.status_code == 200
    result = json.loads(response.data)
    assert result == expected_result
