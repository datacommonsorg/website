# Copyright 2021 Google LLC
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

from main import app


class TestStaticPages(unittest.TestCase):

    def test_homepage(self):
        response = app.test_client().get('/')
        assert response.status_code == 200
        assert b"Sustainability Data Commons" in response.data
        assert b"Kern County" in response.data

    def test_disclaimers(self):
        response = app.test_client().get('/disclaimers')
        assert response.status_code == 200
        assert b"Disclaimers" in response.data

    def test_feedback(self):
        response = app.test_client().get('/feedback')
        assert response.status_code == 200
        assert b"We would love to get your feedback!" in response.data