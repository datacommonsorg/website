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


class TestStaticPages(unittest.TestCase):

  def test_homepage(self):
    response = app.test_client().get('/')
    assert response.status_code == 200
    assert b'data-label="Data Commons"' in response.data

  def test_homepage_i18n(self):
    response = app.test_client().get('/?hl=es')
    assert response.status_code == 200
    # TODO: add i18n
    assert b'data-label="Data Commons"' in response.data

  def test_about(self):
    response = app.test_client().get('/about')
    assert response.status_code == 200
    assert b"About Data Commons" in response.data

  def test_faq(self):
    response = app.test_client().get('/faq')
    assert response.status_code == 200
    assert b"Frequently Asked Questions" in response.data

  def test_disclaimers(self):
    response = app.test_client().get('/disclaimers')
    assert response.status_code == 200
    assert b"Disclaimers" in response.data

  def test_feedback(self):
    response = app.test_client().get('/feedback')
    assert response.status_code == 200
    assert b"We would love to get your feedback!" in response.data

  @patch('server.routes.static.dc.version')
  def test_version_with_spanner_staleness_timestamp(self, mock_version):
    mock_version.return_value = {
        'gitHash': 'mixer-hash',
        'spannerStalenessTimestamp': '2026-07-29T10:21:34.123456Z',
    }

    response = app.test_client().get('/version')

    assert response.status_code == 200
    assert b'mixer-hash' in response.data
    assert b'Spanner Staleness Timestamp:' in response.data
    assert b'2026-07-29T10:21:34.123456Z' in response.data
    assert b'This value may be cached.' in response.data
    assert b'X-Skip-Cache: true' in response.data

  @patch('server.routes.static.dc.version')
  def test_version_without_spanner_staleness_timestamp(self, mock_version):
    mock_version.return_value = {'gitHash': 'older-mixer-hash'}

    response = app.test_client().get('/version')

    assert response.status_code == 200
    assert b'older-mixer-hash' in response.data
    assert b'Spanner Staleness Timestamp:' in response.data
    assert b'Not available' in response.data
