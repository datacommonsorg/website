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
            'country/IND': 'India',
            'country/USA': 'USA',
            'geoId/06029': 'Kern County, CA',
            'geoId/06085': 'Santa Clara County, CA',
            'geoId/0668000': 'San Jose, CA',
            'geoId/22095': 'St John the Baptist Parish, LA',
            'geoId/3651000': 'New York City',
            'wikidataId/Q1445': 'Tamil Nadu',
        }

        response = app.test_client().get('/')
        assert response.status_code == 200
        assert b"Data Commons is an open knowledge repository" in response.data
        assert b"July 26, 2021" in response.data
        assert b"We have launched exciting new features" in response.data
        assert b"Use the Python and REST API's to do your own custom analysis" in response.data
        assert b"We cleaned and processed the data so you don't have to" in response.data
        assert b"Join the effort." in response.data
        assert b"Open sourced" in response.data
        assert b"Schema.org" in response.data
        assert b"Explore the data" in response.data
        assert b"St John the Baptist Parish, LA" in response.data
        assert b"more ..." in response.data

        assert not b"Sustainability Data Commons" in response.data

    @patch('routes.api.place.get_display_name')
    def test_homepage_i18n(self, mock_get_display_name):
        mock_get_display_name.return_value = {
            'country/IND': 'India',
            'country/USA': 'Estados Unidos',
            'geoId/06029': 'Condado de Kern, CA',
            'geoId/06085': 'Condado de Santa Clara, California',
            'geoId/0668000': 'San José, California',
            'geoId/22095': 'Parroquia de St. John the Baptist, Luisiana',
            'geoId/3651000': 'Nueva York, Nueva York',
            'wikidataId/Q1445': 'Tamil Nadu',
        }

        response = app.test_client().get('/?hl=es')
        assert response.status_code == 200
        assert "Data Commons es un repositorio abierto en el que se aglutina información procedente".encode(
        ) in response.data
        assert b"26 de julio de 2021" in response.data
        assert "Usa las API REST y Python para hacer análisis personalizados".encode(
        ) in response.data
        assert "Hemos filtrado y organizado los datos para que no tengas que hacerlo tú.".encode(
        ) in response.data
        assert "Colabora en el proyecto.".encode() in response.data
        assert "código abierto".encode() in response.data
        assert "Schema.org".encode() in response.data
        assert "Consulta los datos".encode() in response.data
        assert "Parroquia de St. John the Baptist, Luisiana".encode(
        ) in response.data
        assert "más...".encode() in response.data

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
