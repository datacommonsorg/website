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


class TestSpecialAnnouncementPages(unittest.TestCase):

  @patch('server.routes.special_announcement.html.list_blobs')
  def test_special_announcement(self, mock_list_blobs):
    mock_list_blobs.side_effect = (lambda bucket, max_blobs: [])
    response = app.test_client().get('/special_announcement')
    assert response.status_code == 200
    assert b"COVID-19 Special Announcements" in response.data

  def test_special_announcement_faq(self):
    response = app.test_client().get('/special_announcement/faq')
    assert response.status_code == 200
    assert b"COVID-19 Data Feed FAQ" in response.data
