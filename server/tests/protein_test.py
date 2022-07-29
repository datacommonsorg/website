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
from flask import request
import json

from main import app


class TestProteinProteinInteractionGraph(unittest.TestCase):

    @patch('routes.api.protein.bfs')
    def test_bfs_small(self, mock_bfs):
        with open('tests/test_data/protein/P53_HUMAN_small.json') as f:
            mock_bfs.return_value = json.load(f)
        response = app.test_client().post('/protein/ppi/bfs',
                                          data={
                                              'depth': 2,
                                              'maxInteractors': 2,
                                              'proteinDcid': 'bio/P53_HUMAN',
                                              'scoreThreshold': 0.4
                                          })
        assert response.status_code == 200
