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

from web_app import app


class TestStaticPage(unittest.TestCase):

  def test_import_wizard_static(self):
    response = app.test_client().get('/import/')
    assert response.status_code == 200
    assert b"Import Wizard - Data Commons" in response.data

  def test_import_wizard_static_new(self):
    response = app.test_client().get('/import/new')
    assert response.status_code == 200
    assert b"Import Wizard - Data Commons" in response.data
