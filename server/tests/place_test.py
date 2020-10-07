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

from main import app


class TestPlace(unittest.TestCase):

    @patch('routes.api.place.get_property_value')
    @patch('routes.api.place.get_place_type')
    def test_place(self, mock_get_place_type, mock_get_property_value):
        mock_get_property_value.return_value = ['Mountain View']
        mock_get_place_type.return_value = 'City'

        response = app.test_client().get('/place', follow_redirects=True)
        assert response.status_code == 200
        assert b"<title>Place Explorer" in response.data
        assert b"<p>The Place Explorer tool helps you" in response.data

        response = app.test_client().get('/place/', follow_redirects=True)
        assert response.status_code == 200
        assert b"<title>Place Explorer" in response.data
        assert b"<p>The Place Explorer tool helps you" in response.data

        mock_get_property_value.return_value = ['California']
        mock_get_place_type.return_value = 'State'

        response = app.test_client().get('/place?dcid=geoId/06',
                                         follow_redirects=True)
        assert response.status_code == 200
        assert b"<title>California" in response.data

        response = app.test_client().get('/place/?dcid=geoId/06',
                                         follow_redirects=True)
        assert response.status_code == 200
        assert b"<title>California" in response.data

        response = app.test_client().get(
            '/place?dcid=geoId/06&topic=Demographics', follow_redirects=True)
        assert response.status_code == 200
        assert b"<title>California Demographics" in response.data

        response = app.test_client().get('/place/geoId/06',
                                         follow_redirects=False)
        assert response.status_code == 200
        assert b"<title>California" in response.data

        response = app.test_client().get('/place/geoId/06/',
                                         follow_redirects=False)
        assert response.status_code == 200
        assert b"<title>California" in response.data

        response = app.test_client().get('/place/geoId/06?topic=Demographics',
                                         follow_redirects=False)
        assert response.status_code == 200
        assert b"<title>California Demographics" in response.data

        response = app.test_client().get('/place/geoId/06/?topic=Demographics',
                                         follow_redirects=False)
        assert response.status_code == 200
        assert b"<title>California Demographics" in response.data

        response = app.test_client().get('/explore/place?dcid=geoId/06',
                                         follow_redirects=True)
        assert response.status_code == 200
        assert b"<title>California" in response.data