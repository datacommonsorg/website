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

from server.lib.i18n import AVAILABLE_LANGUAGES
from server.tests.utils import mock_feature_flags
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
  @patch('server.routes.shared_api.place.api_place_type')
  @patch('server.routes.shared_api.place.get_place_type_i18n_name')
  @patch('server.routes.shared_api.place.parent_places')
  def test_place(self, mock_parent_places, mock_get_place_type_i18n_name,
                 mock_api_place_type, mock_get_i18n_name):
    mock_parent_places.return_value = {
        'geoId/06': [{
            'dcid': 'country/USA',
            'type': 'Country',
            'name': 'United States'
        }]
    }
    mock_get_place_type_i18n_name.return_value = 'State'
    mock_get_i18n_name.return_value = {'geoId/06': 'California'}
    mock_api_place_type.return_value = 'State'

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
    assert b"<title>California - Demographics" in response.data

    response = app.test_client().get(
        '/place?dcid=geoId/06&category=Demographics', follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California - Demographics" in response.data

    response = app.test_client().get('/place/geoId/06', follow_redirects=False)
    assert response.status_code == 200
    assert b"<title>California" in response.data

    response = app.test_client().get('/place/geoId/06/', follow_redirects=False)
    assert response.status_code == 301

    response = app.test_client().get('/place/geoId/06/', follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California" in response.data

    response = app.test_client().get('/place/geoId/06?topic=Demographics',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California - Demographics" in response.data

    response = app.test_client().get('/place/geoId/06?category=Demographics',
                                     follow_redirects=False)
    assert response.status_code == 200
    assert b"<title>California - Demographics" in response.data

    response = app.test_client().get('/place/geoId/06/?topic=Demographics',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California - Demographics" in response.data

    response = app.test_client().get('/place/geoId/06/?topic=Climate',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California - Environment" in response.data

    response = app.test_client().get('/place/geoId/06/?category=Climate',
                                     follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California - Environment" in response.data

    response = app.test_client().get(
        '/place/geoId/06/?category=InvalidCategory', follow_redirects=True)
    assert response.status_code == 200
    assert b"<title>California - Data Commons" in response.data

    test_client = app.test_client()
    with test_client:
      response = test_client.get(
          '/place?dcid=geoId/06&utm_medium=explore&mprop=count&popt=Person&hl=fr',
          follow_redirects=True)
      assert '/place?dcid=geoId/06&utm_medium=explore&mprop=count&popt=Person&hl=fr' in request.url
      assert response.status_code == 200

  @patch('server.routes.shared_api.place.get_i18n_name')
  @patch('server.routes.shared_api.place.api_place_type')
  @patch('server.routes.shared_api.place.get_place_type_i18n_name')
  @patch('server.routes.shared_api.place.parent_places')
  def test_get_canonical_links(self, mock_parent_places,
                               mock_get_place_type_i18n_name,
                               mock_api_place_type, mock_get_i18n_name):
    from server.routes.place.html import get_canonical_links

    # Test canonical links for overview page
    links = get_canonical_links('geoId/06', None)
    # Ensure the number of canonical links is num available languages + 2 for x-default and canonical
    assert len(links) == len(AVAILABLE_LANGUAGES) + 2
    assert '<link rel="canonical" href="https://datacommons.org/place/geoId/06">' in links
    assert '<link rel="alternate" hreflang="x-default" href="https://datacommons.org/place/geoId/06">' in links
    assert '<link rel="alternate" hreflang="en" href="https://datacommons.org/place/geoId/06">' in links
    assert '<link rel="alternate" hreflang="ru" href="https://datacommons.org/place/geoId/06?hl=ru">' in links

    # Test canonical links for category page
    links = get_canonical_links('geoId/06', 'Health')
    # Ensure the number of canonical links is num available languages + 2 for x-default and canonical
    assert len(links) == len(AVAILABLE_LANGUAGES) + 2
    assert '<link rel="canonical" href="https://datacommons.org/place/geoId/06?category=Health">' in links
    assert '<link rel="alternate" hreflang="x-default" href="https://datacommons.org/place/geoId/06?category=Health">' in links
    assert '<link rel="alternate" hreflang="en" href="https://datacommons.org/place/geoId/06?category=Health">' in links
    assert '<link rel="alternate" hreflang="ru" href="https://datacommons.org/place/geoId/06?category=Health&hl=ru">' in links

    # Test empty list returned for invalid category
    links = get_canonical_links('geoId/06', 'InvalidCategory')
    assert links == []


class TestRedirectToPlacePage(unittest.TestCase):
  """Tests for the redirect_to_place_page function."""

  @patch('flask.url_for')
  @patch('flask.redirect')
  def test_redirect_to_place_page(self, mock_redirect, mock_url_for):
    """Test that redirect_to_place_page properly formats the redirect URL."""
    from werkzeug.datastructures import MultiDict

    from server.routes.place.html import redirect_to_place_page

    # Setup test data
    dcid = 'geoId/06'
    request_args = MultiDict([('dcid', 'geoId/06'), ('category', 'Health'),
                              ('hl', 'en'), ('utm_medium', 'explore')])

    # Mock url_for to return a specific URL
    mock_url_for.return_value = '/place/geoId/06?category=Health&hl=en&utm_medium=explore'

    # Need to run within app context
    with app.app_context():
      # Call the function
      redirect_to_place_page(dcid, request_args)

      # Verify url_for was called with correct arguments
      mock_url_for.assert_called_once_with('place.place',
                                           category='Health',
                                           hl='en',
                                           utm_medium='explore',
                                           place_dcid='geoId/06',
                                           _external=True,
                                           _scheme='http')

      # Verify redirect was called with the URL from url_for
      mock_redirect.assert_called_once_with(
          '/place/geoId/06?category=Health&hl=en&utm_medium=explore')
