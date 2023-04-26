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

import json
import unittest
from unittest.mock import patch

from web_app import app


class TestCoords2Places(unittest.TestCase):

  @patch('server.routes.api.place.dc.resolve_coordinates')
  @patch('server.routes.api.place.names')
  @patch('server.routes.api.place.dc.property_values')
  def test_get_places_for_coords(self, mock_property_values, mock_place_names,
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
            'placeCoordinates': [{
                'latitude': 1,
                'longitude': -5,
                'placeDcids': ['place2', 'place1']
            }, {
                'latitude': 2,
                'longitude': 55,
                'placeDcids': ['place3']
            }, {
                'latitude': 3.4,
                'longitude': 48,
                'placeDcids': ['place1', 'place3']
            }]
        }
      else:
        return None

    mock_resolve_coordinates.side_effect = resolve_coordinates_side_effect

    def property_values_side_effect(dcids, prop):
      if set(dcids) == set(['place1', 'place2', 'place3']) and prop == "typeOf":
        return {
            'place1': [place_type, 'AA1'],
            'place2': [place_type],
            'place3': ['Country']
        }
      else:
        return None

    mock_property_values.side_effect = property_values_side_effect

    def place_names_side_effect(dcids):
      if set(dcids) == set(['place1', 'place2']):
        return {'place1': "", 'place2': "place2name"}
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
        'longitude': -5,
        'latitude': 1,
        'placeDcid': 'place2',
        'placeName': 'place2name'
    }, {
        'longitude': 48,
        'latitude': 3.4,
        'placeDcid': 'place1',
        'placeName': 'place1'
    }]
    assert response_data == expected_response
