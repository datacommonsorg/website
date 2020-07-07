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

import collections
import json

from flask import Blueprint

from cache import cache
from services.datacommons import fetch_data

WANTED_PLACE_TYPES = ["Country", "State", "County", "City"]

# Define blueprint
bp = Blueprint(
  "place",
  __name__,
  url_prefix='/api/place'
)


@bp.route('/child/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def child(dcid):
    """
    Get the child places for a place.
    """
    return json.dumps(child_fetch(dcid))


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def child_fetch(dcid):
    response = fetch_data(
      '/node/property-values',
      {
        'dcids': [dcid],
        'property': 'containedInPlace',
        'direction': 'in'
      },
      compress=False,
      post=True
    )
    places = response[dcid].get('in', [])
    result = collections.defaultdict(list)
    for place in places:
        for place_type in place['types']:
            if place_type in WANTED_PLACE_TYPES:
                result[place_type].append({
                  'name': place['name'],
                  'dcid': place['dcid'],
                })
                break
    for place_type in result:
        result[place_type].sort(key=lambda x: x['dcid'])
    return result
