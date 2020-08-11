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

from flask import Blueprint, request, jsonify

from cache import cache
from services.datacommons import fetch_data
import services.datacommons as dc
from routes.api.stats import get_stats_wrapper

WANTED_PLACE_TYPES = ["Country",
                      "State",
                      "Province",
                      "County",
                      "City",
                      "Town",
                      "Village",
                      "Borough",
                      "CensusZipCodeTabulationArea",
                      "EurostatNUTS1",
                      "EurostatNUTS2",
                      "EurostatNUTS3",
                      "AdministrativeArea1",
                      "AdministrativeArea2",
                      "AdministrativeArea3",
                      "AdministrativeArea4",
                      "AdministrativeArea5"]

# These place types are equivalent: prefer the key.
EQUIVALENT_PLACE_TYPES = {
    "State": "AdministrativeArea1",
    "County": "AdministrativeArea2",
    "City": "AdministrativeArea3",
    "Town": "City",
    "Borough": "City",
    "Village": "City",
}

CHILD_PLACE_LIMIT = 20

# Define blueprint
bp = Blueprint(
    "place",
    __name__,
    url_prefix='/api/place'
)


@bp.route('/name')
def name():
    """Get place names."""
    dcids = request.args.getlist('dcid')
    response = fetch_data(
        '/node/property-values',
        {
            'dcids': dcids,
            'property': 'name',
            'direction': 'out'
        },
        compress=False,
        post=True
    )
    result = {}
    for dcid in dcids:
        values = response[dcid].get('out')
        result[dcid] = values[0]['value'] if values else ''
    return json.dumps(result)


@bp.route('/statsvars/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def statsvars_route(dcid):
    """Get all the statistical variables that exist for a give place.

    Args:
      dcid: Place dcid.

    Returns:
      A list of statistical variable dcids.
    """
    return json.dumps(statsvars(dcid))


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def statsvars(dcid):
    """
    Get all the statistical variable dcids for a place.
    """
    response = fetch_data(
        '/place/stats-var',
        {
            'dcids': [dcid],
        },
        compress=False,
        post=False,
        has_payload=False
    )
    return response['places'][dcid]['statsVars']


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


# Defines the map from higher geos to their respective subgeos.
SUB_GEO_LEVEL_MAP = {
    "Country": "AdministrativeArea1",
    "AdministrativeArea1": "AdministrativeArea2",
    "AdministrativeArea2": "City"
}
@bp.route('child/statvars/<path:dcid>')
def child_statvars(dcid):
    """
    Gets all statistical variables available for a particular sublevel of a
        dcid.
    API Params:
        dcid -> The place dcid to pull information for, as a string.
        level -> The level of children to pull for, as a string. If omitted,
            then the subgeo is determined.
    Example Query:
        api/place/child/statvars?dcid=country/USA&level=State
        Returns all statistical variables that are value for states of the USA.
    Returns:
        A json list of all the available statistical variables.
    """
    # Get required params.
    if dcid:
        return jsonify({"error": "Must provide a 'dcid' field!"}, 400)
    requested_level = request.args.get("level")
    if requested_level:
        dcid_type = dc.get_property_values([dcid],
                                                "typeOf")[dcid]
        for level in dcid_type:
            if level in SUB_GEO_LEVEL_MAP:
                requested_level = SUB_GEO_LEVEL_MAP[level]
                break
        # Level lookup failed if no level is in the dictionary.
        if requested_level:
            return jsonify(
                {"error": "Could not determine subgeo for {dcid}."}, 500)

    # Get sublevels.
    geos_contained_in_place = dc.get_places_in(
        [dcid], requested_level)
    if dcid not in geos_contained_in_place:
        return jsonify({"error": "Internal server error."}, 500)
    geos_contained_in_place = geos_contained_in_place[dcid]

    # Get all available Statistical Variables for subgeos.
    # Only the union of the first 10 geos are returned for speed.
    stat_vars_for_subgeo = set()
    for geoId in geos_contained_in_place[:10]:
        stat_vars_for_subgeo = stat_vars_for_subgeo.union(statsvars(geoId))
    return json.dumps(list(stat_vars_for_subgeo))


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
        dcid: stats.get('data', {}).get('2018', 0)
        for dcid, stats in pop.items() if stats
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
    # Filter equivalent place types
    for (preferred, equivalent) in EQUIVALENT_PLACE_TYPES.items():
        if preferred in result and equivalent in result:
            del result[equivalent]
    return result


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/parent/<path:dcid>')
def parent_place(dcid):
    """
    Get the parent places for a place.
    """
    # In DataCommons knowledge graph, places has multiple containedInPlace
    # relation with parent places, but it might not be comprehensive. For
    # example, "Moutain View" is containedInPlace for "Santa Clara County" and
    # "California" but not "United States":
    # https://datacommons.org/browser/geoId/0649670
    # Here calling get_parent_place twice to get to the top parents.
    parents1 = get_parent_place(dcid)
    parents2 = get_parent_place(parents1[-1]['dcid'])
    parents1.extend(parents2)
    if parents2:
        parents3 = get_parent_place(parents2[-1]['dcid'])
        parents1.extend(parents3)
    return json.dumps(parents1)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_parent_place(dcid):
    response = fetch_data(
        '/node/property-values',
        {
            'dcids': [dcid],
            'property': 'containedInPlace',
            'direction': 'out'
        },
        compress=False,
        post=True
    )
    parents = response[dcid].get('out', [])
    parents.sort(key=lambda x: x['dcid'], reverse=True)
    for i in range(len(parents)):
        if len(parents[i]['types']) > 1:
            parents[i]['types'] = [
                x for x in parents[i]['types']
                if not x.startswith('AdministrativeArea')]
    return parents
