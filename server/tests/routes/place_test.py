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

from web_app import app


class TestPlaceLandingPage(unittest.TestCase):

  @patch('server.routes.shared_api.place.get_display_name')
  def test_place_landing(self, mock_get_display_name):
    mock_get_display_name.return_value = {
        'geoId/1714000': 'Chicago, IL',
        'geoId/4805000': 'Austin, TX',
        'geoId/0667000': 'San Francisco, CA',
        'geoId/5363000': 'Seattle, WA',
        'geoId/17031': 'Cook County, IL',
        'geoId/06059': 'Orange County, CA',
        'geoId/48201': 'Harris County, TX',
        'geoId/06085': 'Santa Clara County, CA',
        'geoId/06': 'California',
        'geoId/48': 'Texas',
        'geoId/17': 'Illinois',
        'geoId/21': 'Kentucky',
        'geoId/36': 'New York',
        'geoId/26': 'Michigan',
        'country/CAN': 'Canada',
        'country/USA': 'United States of America',
        'country/IND': 'India',
        'country/MYS': 'Malaysia',
        'country/DEU': 'Germany'
    }

    response = app.test_client().get('/place', follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>Place Explorer" in response.data
    assert b"<p>The Place Explorer tool helps you" in response.data
    assert b"Cook County, IL" in response.data

    response = app.test_client().get('/place/', follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>Place Explorer" in response.data
    assert b"<p>The Place Explorer tool helps you" in response.data
    assert b"Canada" in response.data


class TestPlacePage(unittest.TestCase):

  @patch('server.routes.shared_api.place.get_i18n_name')
  @patch('server.routes.shared_api.place.get_place_type')
  def test_place(self, mock_get_place_type, mock_get_i18n_name):
    mock_get_i18n_name.return_value = {'geoId/06': 'California'}
    mock_get_place_type.return_value = 'State'

    response = app.test_client().get('/place?dcid=geoId/06',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California" in response.data

    response = app.test_client().get('/place/?dcid=geoId/06',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California" in response.data

    response = app.test_client().get('/place?dcid=geoId/06&topic=Demographics',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California Demographics" in response.data

    response = app.test_client().get(
        '/place?dcid=geoId/06&category=Demographics', follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California Demographics" in response.data

    response = app.test_client().get('/place/geoId/06', follow_redirects=False)
    assert response.status_code == 200
    assert b"<title>California" in response.data

    response = app.test_client().get('/place/geoId/06/', follow_redirects=False)
    assert response.status_code == 200
    assert b"<title>California" in response.data

    response = app.test_client().get('/place/geoId/06?topic=Demographics',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California Demographics" in response.data

    response = app.test_client().get('/place/geoId/06?category=Demographics',
                                     follow_redirects=False)
    assert response.status_code == 200
    assert b"<title>California Demographics" in response.data

    response = app.test_client().get('/place/geoId/06/?topic=Demographics',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California Demographics" in response.data

    response = app.test_client().get('/place/geoId/06/?topic=Climate',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California Environment" in response.data

    response = app.test_client().get('/place/geoId/06/?category=Climate',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California Environment" in response.data

    # TODO(beets): construct a better test that doesn't rely on prod.
    response = app.test_client().get('/explore/place?dcid=geoId/06',
                                     follow_redirects=False)
    assert response.status_code == 302

    test_client = app.test_client()
    with test_client:
      response = test_client.get(
          '/place?dcid=geoId/06&utm_medium=explore&mprop=count&popt=Person&hl=fr',
          follow_redirects=True)
      assert '/place?dcid=geoId/06&utm_medium=explore&mprop=count&popt=Person&hl=fr' in request.url
      assert response.status_code == 200
