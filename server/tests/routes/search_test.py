# Copyright 2022 Google LLC
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


class TestSearchPages(unittest.TestCase):

  def test_search(self):
    response = app.test_client().get('/search')
    assert response.status_code == 200
    assert b"Search - Data Commons" in response.data

  def test_search_dc(self):
    response = app.test_client().get('/search_dc')
    assert response.status_code == 200
    assert b"Search - Data Commons" in response.data

  def test_search_query(self):
    response = app.test_client().get('/search?q=foobar')
    assert response.status_code == 200
    assert b'data-query="foobar"' in response.data

  def test_search_dc_query(self):
    response = app.test_client().get('/search_dc?q=foobar')
    assert response.status_code == 200
    assert b'data-query="foobar"' in response.data
