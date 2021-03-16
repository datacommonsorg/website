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


class TestStaticPages(unittest.TestCase):

    @patch('routes.api.place.get_display_name')
    def test_homepage(self, mock_get_display_name):
        mock_get_display_name.return_value = {
            'geoId/1150000': 'Washington, DC',
            'geoId/3651000': 'New York City, NY',
            'geoId/0649670': 'Mountain View, CA',
            'geoId/4805000': 'Austin, TX'
        }

        response = app.test_client().get('/')
        assert response.status_code == 200
        assert b"Data Commons is an open knowledge repository" in response.data
        assert b"Data Commons is now accessible on Google Search!" in response.data
        assert b"Use the Python and REST API's to do your own custom analysis" in response.data
        assert b"Including data from" in response.data
        assert b"We cleaned and processed the data so you don't have to" in response.data
        assert b"Join the effort." in response.data
        assert b"Open sourced" in response.data
        assert b"Schema.org" in response.data
        assert b"Explore the data" in response.data
        assert b"Mountain View, CA" in response.data
        assert b"more ..." in response.data

    @patch('routes.api.place.get_display_name')
    def test_homepage(self, mock_get_display_name):
        mock_get_display_name.return_value = {
            'geoId/1150000': 'Washington, Distrito de Columbia',
            'geoId/3651000': 'New York City, New York',
            'geoId/0649670': 'Mountain View, California',
            'geoId/4805000': 'Austin, Texas'
        }

        response = app.test_client().get('/?hl=es')
        assert response.status_code == 200
        assert b"Data Commons es un repositorio abierto en el que se aglutina información procedente" in response.data
        assert b"Ya se puede acceder a Data Commons desde la Búsqueda de Google" in response.data
        assert b"Usa las API REST y Python para hacer análisis personalizados" in response.data
        assert b"Se incluyen datos de" in response.data
        assert b"Hemos filtrado y organizado los datos para que no tengas que hacerlo tú." in response.data
        assert b"Colabora en el proyecto." in response.data
        assert b"código abierto" in response.data
        assert b"Schema.org" in response.data
        assert b"Consulta los datos" in response.data
        assert b"Washington, Distrito de Columbia" in response.data
        assert b"más..." in response.data

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

    def test_datasets(self):
        response = app.test_client().get('/datasets')
        assert response.status_code == 200
        assert b"Datasets" in response.data

    def test_feedback(self):
        response = app.test_client().get('/feedback')
        assert response.status_code == 200
        assert b"We would love to get your feedback!" in response.data

    @patch('routes.static.list_blobs')
    def test_special_announcement(self, mock_list_blobs):
        mock_list_blobs.side_effect = (lambda bucket, max_blobs: [])
        response = app.test_client().get('/special_announcement')
        assert response.status_code == 200
        assert b"COVID-19 Special Announcements" in response.data

    def test_special_announcement_faq(self):
        response = app.test_client().get('/special_announcement/faq')
        assert response.status_code == 200
        assert b"COVID-19 Data Feed FAQ" in response.data
