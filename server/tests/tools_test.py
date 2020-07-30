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

from main import app


class TestStaticPage(unittest.TestCase):
    def test_timeline(self):
        response = app.test_client().get('/tools/timeline')
        assert response.status_code == 200
        assert b"Welcome to Data Commons." in response.data


    def test_download(self):
        response = app.test_client().get('/tools/download')
        assert response.status_code == 200
        assert b"By using these API/Data" in response.data


    def test_scatter(self):
        response = app.test_client().get('/tools/scatter')
        assert response.status_code == 200
        assert b"Please select two variables from the left menu" in response.data


    def test_choropleth(self):
        response = app.test_client().get('/tools/choropleth')
        assert response.status_code == 200
