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

import pytest
import unittest
import json

from main import app


class TestRoute(unittest.TestCase):

    def required_fields(self):
        """Failure if required fields are not present."""
        no_stat_var = app.test_client().get(
            '/choropleth/download?&perCapita=false&place=country/USA')
        assert no_stat_var.status_code == 400

        no_place = app.test_client().get(
            '/choropleth/download?statVar=Count_Person_InLaborForce&perCapita=false'
        )
        assert no_place.status_code == 400

    def sublevel_geos_returned(self):
        """Ensures that features are returned."""
        state_geos = app.test_client().get(
            '/choropleth/download?&statVar=Count_Person_InLaborForce&perCapita=true&place=country/USA'
        )
        response_json = json.loads(state_geos)

        assert 'geoJson' in response_json
        assert 'features' in response_json['geoJson']
        assert len(response_json['geoJson']['features']) >= 50
