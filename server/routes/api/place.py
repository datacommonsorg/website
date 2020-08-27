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
import services.datacommons as dc

from flask import Blueprint, jsonify, request, Response

from cache import cache
from services.datacommons import fetch_data
import routes.api.stats as stats_api

# Place types to keep for list of child places, keyed by parent place type.
WANTED_PLACE_TYPES = {
    'Country': [
        "State", "EurostatNUTS1", "EurostatNUTS2", "AdministrativeArea1"
    ],
    'State': ["County"],
    'County': ["City", "Town", "Village", "Borough"],
}
ALL_WANTED_PLACE_TYPES = [
    "Country", "State", "County", "City", "Town", "Village", "Borough",
    "CensusZipCodeTabulationArea", "EurostatNUTS1", "EurostatNUTS2",
    "EurostatNUTS3", "AdministrativeArea1", "AdministrativeArea2",
    "AdministrativeArea3", "AdministrativeArea4", "AdministrativeArea5"
]

# These place types are equivalent: prefer the key.
EQUIVALENT_PLACE_TYPES = {
    "State": "AdministrativeArea1",
    "County": "AdministrativeArea2",
    "City": "AdministrativeArea3",
    "Town": "City",
    "Borough": "City",
    "Village": "City",
}

CHILD_PLACE_LIMIT = 50

# Minimal population count for a place to show up in nearby places list.
MIN_POP = 5000

# Contains statistical variable and the display name used for place rankings.
RANKING_STATS = {
    'Count_Person': 'Largest Population',
    'Median_Income_Person': 'Highest Median Income',
    'Median_Age_Person': 'Highest Median Age',
    'UnemploymentRate_Person': 'Highest Unemployment Rate',
}

# Define blueprint
bp = Blueprint("api.place", __name__, url_prefix='/api/place')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_property_value(dcid, prop, out=True):
    return dc.get_property_values([dcid], prop, out)[dcid]


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_place_type(place_dcid):
    place_types = get_property_value(place_dcid, 'typeOf')
    # We prefer to use specific type like "State", "County" over
    # "AdministrativeArea"
    chosen_type = None
    for place_type in place_types:
        if not chosen_type or chosen_type.startswith('AdministrativeArea') \
            or chosen_type == 'Place':
            chosen_type = place_type
    return chosen_type


@bp.route('/name')
def name():
    """Get place names."""
    dcids = request.args.getlist('dcid')
    response = fetch_data('/node/property-values', {
        'dcids': dcids,
        'property': 'name',
        'direction': 'out'
    },
                          compress=False,
                          post=True)
    result = {}
    for dcid in dcids:
        values = response[dcid].get('out')
        result[dcid] = values[0]['value'] if values else ''
    return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/statsvars/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def statsvars_route(dcid):
    """Get all the statistical variables that exist for a give place.

    Args:
      dcid: Place dcid.

    Returns:
      A list of statistical variable dcids.
    """
    return Response(json.dumps(statsvars(dcid)),
                    200,
                    mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def statsvars(dcid):
    """
    Get all the statistical variable dcids for a place.
    """
    response = fetch_data('/place/stats-var', {
        'dcids': [dcid],
    },
                          compress=False,
                          post=False,
                          has_payload=False)
    return response['places'][dcid].get('statsVars', [])


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
    return Response(json.dumps(child_places), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def child_fetch(dcid):
    contained_response = fetch_data('/node/property-values', {
        'dcids': [dcid],
        'property': 'containedInPlace',
        'direction': 'in'
    },
                                    compress=False,
                                    post=True)

    overlaps_response = fetch_data('/node/property-values', {
        'dcids': [dcid],
        'property': 'geoOverlaps',
        'direction': 'in'
    },
                                   compress=False,
                                   post=True)
    places = contained_response[dcid].get(
        'in', []) + overlaps_response[dcid].get('in', [])

    dcid_str = '^'.join(sorted(map(lambda x: x['dcid'], places)))
    pop = stats_api.get_stats_latest(dcid_str, 'Count_Person')

    place_type = get_place_type(dcid)
    wanted_types = WANTED_PLACE_TYPES.get(place_type, ALL_WANTED_PLACE_TYPES)
    result = collections.defaultdict(list)
    for place in places:
        for place_type in place['types']:
            place_pop = pop.get(place['dcid'], 0)
            # TODO(beets): Remove this when we push resolved places to prod.
            if place['dcid'].startswith('geoNames'):
                continue
            if place_type in wanted_types and place_pop > 0:
                result[place_type].append({
                    'name': place.get('name', place['dcid']),
                    'dcid': place['dcid'],
                    'pop': place_pop,
                })

    # Filter equivalent place types - if a child place occurs in multiple groups, keep it in the preferred group type.
    for (preferred, equivalent) in EQUIVALENT_PLACE_TYPES.items():
        if preferred in result and equivalent in result:
            for preferred_place in result[preferred]:
                for i, equivalent_place in enumerate(result[equivalent]):
                    if preferred_place['dcid'] == equivalent_place['dcid']:
                        del result[equivalent][i]
                        break

    # Drop empty categories
    result = dict(filter(lambda x: len(x) > 0, result.items()))
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
    if len(parents1) == 0:
        return []
    parents2 = get_parent_place(parents1[-1]['dcid'])
    parents1.extend(parents2)
    if parents2:
        parents3 = get_parent_place(parents2[-1]['dcid'])
        parents1.extend(parents3)
    return Response(json.dumps(parents1), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_parent_place(dcid):
    response = fetch_data('/node/property-values', {
        'dcids': [dcid],
        'property': 'containedInPlace',
        'direction': 'out'
    },
                          compress=False,
                          post=True)
    parents = response[dcid].get('out', [])
    parents.sort(key=lambda x: x['dcid'], reverse=True)
    for i in range(len(parents)):
        if len(parents[i]['types']) > 1:
            parents[i]['types'] = [
                x for x in parents[i]['types']
                if not x.startswith('AdministrativeArea')
            ]
    return parents


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_property_value(dcid, prop, out=True):
    return dc.get_property_values([dcid], prop, out)[dcid]


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/mapinfo/<path:dcid>')
def api_mapinfo(dcid):
    """
    TODO(wsws/boxu): This function only works for the US, which doesn't have
    the issue of crossing +-180 longitude and +-90 latitude. If using this
    function for places with those complicated situations, need to adjust this
    function accordingly.
    """
    left = 180
    right = -180
    up = -90
    down = 90
    coordinate_sequence_set = []
    kmlCoordinates = get_property_value(dcid, 'kmlCoordinates')
    if not kmlCoordinates:
        return {}

    coordinate_groups = kmlCoordinates[0].split('</coordinates><coordinates>')
    for coordinate_group in coordinate_groups:
        coordinates = coordinate_group.replace('<coordinates>', '').replace(
            '</coordinates>', '').split(' ')
        coordinate_sequence = []
        for coordinate in coordinates:
            v = coordinate.split(',')
            x = float(v[0])
            y = float(v[1])
            left = min(left, x)
            right = max(right, x)
            down = min(down, y)
            up = max(up, y)
            coordinate_sequence.append({'lat': y, 'lng': x})
        coordinate_sequence_set.append(coordinate_sequence)

    x_spread = right - left
    y_spread = up - down
    margin = 0.02

    return {
        'left': left - margin * x_spread,
        'right': right + margin * x_spread,
        'up': up + margin * y_spread,
        'down': down - margin * y_spread,
        'coordinateSequenceSet': coordinate_sequence_set
    }


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_related_place(dcid,
                      stats_vars_string,
                      same_place_type=None,
                      within_place=None,
                      is_per_capita=None):
    stats_vars = stats_vars_string.split('^')

    return dc.get_related_place(dcid,
                                stats_vars,
                                same_place_type=same_place_type,
                                within_place=within_place,
                                is_per_capita=is_per_capita)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/similar/<stats_var>/<path:dcid>')
def api_similar_places(stats_var, dcid):
    """
    Get the similar places for a given place by stats var.
    """
    return dc.get_related_place(dcid, [stats_var],
                                same_place_type=True).get(stats_var, {})


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/nearby/<path:dcid>')
def api_nearby_places(dcid):
    """
    Get the nearby places for a given place.
    """
    req_json = {'dcids': [dcid], 'property': 'nearbyPlaces', 'direction': 'out'}
    url = dc.API_ROOT + dc.API_ENDPOINTS['get_property_values']
    payload = dc.send_request(url, req_json=req_json)
    prop_values = payload[dcid].get('out')
    if not prop_values:
        return json.dumps([])
    places = []
    for prop_value in prop_values:
        places.append(prop_value['value'].split('@'))
    places.sort(key=lambda x: x[1])
    dcids = [place[0] for place in places]
    pop = stats_api.get_stats_latest('^'.join(dcids), 'Count_Person')

    filtered_dcids = []
    # Filter out places that are smaller certain population.
    for x, count in pop.items():
        if count > MIN_POP:
            filtered_dcids.append(x)
    filtered_dcids.sort(key=lambda x: pop[x])
    filtered_dcids.insert(0, dcid)
    return Response(json.dumps(filtered_dcids),
                    200,
                    mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/ranking/<path:dcid>')
def api_ranking(dcid):
    """
    Get the ranking information for a given place.
    """
    parents = json.loads(parent_place(dcid))
    selected_parents = []
    parent_names = {}
    for parent in parents:
        parent_dcid = parent['dcid']
        parent_types = parent['types'][0]
        if parent_types == 'Continent':
            continue
        if parent_dcid.startswith('zip'):
            continue
        selected_parents.append(parent_dcid)
        parent_names[parent_dcid] = parent['name']
        if len(selected_parents) == 3:
            break
    result = collections.defaultdict(list)
    for parent in selected_parents:
        stats_var_string = '^'.join(RANKING_STATS.keys())
        response = get_related_place(dcid,
                                     stats_var_string,
                                     same_place_type=True,
                                     within_place=parent)
        for stats_var, data in response.items():
            result[RANKING_STATS[stats_var]].append({
                'name': parent_names[parent],
                'data': data
            })

        # Crime stats var is separted from RANKING_STATS as it uses perCapita
        # option.
        # TOOD(shifucun): merge this once https://github.com/datacommonsorg/mixer/issues/262 is fixed.
        crime_statsvar = {
            'Count_CriminalActivities_CombinedCrime': 'Highest Crime Per Capita'
        }
        response = get_related_place(dcid,
                                     '^'.join(crime_statsvar.keys()),
                                     same_place_type=True,
                                     within_place=parent,
                                     is_per_capita=True)
        for stats_var, data in response.items():
            result[crime_statsvar[stats_var]].append({
                'name': parent_names[parent],
                'data': data
            })

    result['label'] = list(RANKING_STATS.values()) + \
        list(crime_statsvar.values())
    for label in result['label']:
        result[label] = [x for x in result[label] if x['data']]
    result['label'] = [x for x in result['label'] if result[x]]
    return result
