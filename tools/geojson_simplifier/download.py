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
"""
Downloads and saves GeoJson map files from DataCommons.
    Typical usage:
    python3 download.py
"""

import datacommons as dc
import geojson


# TODO(fpernice-google): support downloading more than just US states
class GeojsonDownloder:
    LEVEL_MAP = {
        "Country": "AdministrativeArea1",
        "AdministrativeArea1": "AdministrativeArea2",
        "AdministrativeArea2": "City"
    }

    def __init__(self):
        dc.set_api_key('dev')
        self.geojsons = None

    def download_data(self, place='country/USA'):
        geolevel_below = dc.get_property_values([place],
                                                "typeOf")
        geolevel_below = geolevel_below[place][0]
        geos_contained_in_place = dc.get_places_in(
                                    [place],
                                    self.LEVEL_MAP[geolevel_below])
        geos_contained_in_place = geos_contained_in_place[place]
        self.geojsons = dc.get_property_values(geos_contained_in_place,
                                               "geoJsonCoordinates")

    def save(self, prefix='', path='./original-data/'):
        for geoid in self.geojsons:
            assert len(self.geojsons[geoid]) == 1
            coords = self.geojsons[geoid][0]
            filename = geoid.replace('/', '-')
            with open(path + prefix + filename + '.geojson', 'w') as f:
                geojson.dump(geojson.loads(coords), f)


if __name__ == '__main__':
    loader = GeojsonDownloder()
    loader.download_data()
    loader.save()
