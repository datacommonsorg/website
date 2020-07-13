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
from routes.api.stats import get_stats_wrapper

WANTED_PLACE_TYPES = ["Country", "State", "County", "City"]
CHILD_PLACE_LIMIT = 20

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
    Get top child places for a place.
    """
    child_places = child_fetch(dcid)
    for place_type in child_places:
        child_places[place_type].sort(key=lambda x: x['pop'], reverse=True)
        child_places[place_type] = child_places[place_type][:CHILD_PLACE_LIMIT]
    return json.dumps(child_places)


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
    dcid_str = '^'.join(sorted(map(lambda x: x['dcid'], places)))
    pop = json.loads(get_stats_wrapper(dcid_str, 'Count_Person'))

    pop = {
      dcid: stats.get('data', {}).get('2018', 0) for dcid, stats in pop.items()
      if stats
    }

    result = collections.defaultdict(list)
    for place in places:
        for place_type in place['types']:
            if place_type in WANTED_PLACE_TYPES:
                result[place_type].append({
                  'name': place['name'],
                  'dcid': place['dcid'],
                  'pop': pop.get(place['dcid'], 0)
                })
                break
    return result
