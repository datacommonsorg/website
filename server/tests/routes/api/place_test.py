# Copyright 2023 Google LLC
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

import json
import unittest
from unittest.mock import patch

from web_app import app


class TestCoords2Places(unittest.TestCase):

  @patch('server.routes.shared_api.place.fetch.resolve_coordinates')
  @patch('server.routes.shared_api.place.names')
  def test_get_places_for_coords(self, mock_place_names,
                                 mock_resolve_coordinates):
    test_coordinates = [{
        'latitude': '1',
        'longitude': '-5'
    }, {
        'latitude': '2',
        'longitude': '55'
    }, {
        'latitude': '3.4',
        'longitude': '48'
    }]
    place_type = "County"

    def resolve_coordinates_side_effect(coordinates):
      if coordinates == test_coordinates:
        return {
            '1#-5': [{
                'dcid': 'place2',
                'dominantType': 'County'
            }, {
                'dcid': 'place1',
                'dominantType': 'County'
            }],
            '2#55': [{
                'dcid': 'place3',
                'dominantType': 'County'
            }],
            '3.4#48': [{
                'dcid': 'place1',
                'dominantType': 'County'
            }, {
                'dcid': 'place3',
                'dominantType': 'County'
            }]
        }
      else:
        return None

    mock_resolve_coordinates.side_effect = resolve_coordinates_side_effect

    def place_names_side_effect(dcids):
      if set(dcids) == set(['place1', 'place2', 'place3']):
        return {'place1': '', 'place2': 'place2name', 'place': 'place3name'}
      else:
        return None

    mock_place_names.side_effect = place_names_side_effect

    response = app.test_client().get('/api/place/coords2places',
                                     query_string={
                                         "latitudes": [1, 2, 3.4],
                                         "longitudes": [-5, 55, 48],
                                         "placeType": place_type
                                     })
    assert response.status_code == 200
    response_data = json.loads(response.data)
    expected_response = [{
        'longitude': -5.0,
        'latitude': 1.0,
        'placeDcid': 'place2',
        'placeName': 'place2name'
    }, {
        'longitude': 48.0,
        'latitude': 3.4,
        'placeDcid': 'place1',
        'placeName': 'place1'
    }]
    assert response_data == expected_response
