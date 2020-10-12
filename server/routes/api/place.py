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
import random
import re
import time

from flask import Blueprint, jsonify, request, Response, url_for

from cache import cache
import services.datacommons as dc
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

# Contains statistical variable and the display name used for place rankings.
RANKING_STATS = {
    'Count_Person': 'Largest Population',
    'Median_Income_Person': 'Highest Median Income',
    'Median_Age_Person': 'Highest Median Age',
    'UnemploymentRate_Person': 'Highest Unemployment Rate',
}

STATE_EQUIVALENTS = {"State", "AdministrativeArea1"}
US_ISO_CODE_PREFIX = 'US'

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


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def cached_name(dcids):
    """Returns display names for set of dcids.

    Args:
        dcids: ^ separated string of dcids. It must be a single string for the cache.

    Returns:
        A dictionary of display place names, keyed by dcid.
    """
    dcids = dcids.split('^')
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
    return result


def get_name(dcids):
    """Returns display names for set of dcids.

    Args:
        dcids: A list of place dcids.

    Returns:
        A dictionary of display place names, keyed by dcid.
    """
    return cached_name('^'.join((sorted(dcids))))


@bp.route('/name')
def api_name():
    """Get place names."""
    dcids = request.args.getlist('dcid')
    result = get_name(dcids)
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
    places = contained_response[dcid].get('in', [])

    overlaps_response = fetch_data('/node/property-values', {
        'dcids': [dcid],
        'property': 'geoOverlaps',
        'direction': 'in'
    },
                                   compress=False,
                                   post=True)
    places = places + overlaps_response[dcid].get('in', [])

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


@bp.route('/parent/<path:dcid>')
def api_parent_places(dcid):
    result = parent_places(dcid)[dcid]
    return Response(json.dumps(result), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def parent_places(dcids):
    """ Get the parent place chain for a list of places.

    Args:
        dcids: ^ separated string of dcids. It must be a single string for the cache.

    Returns:
        A dictionary of lists of parent places, keyed by dcid.
    """
    # In DataCommons knowledge graph, places has multiple containedInPlace
    # relation with parent places, but it might not be comprehensive. For
    # example, "Mountain View" is containedInPlace for "Santa Clara County" and
    # "California" but not "United States":
    # https://datacommons.org/browser/geoId/0649670
    # Here calling get_parent_place twice to get to the top parents.
    if not dcids:
        return {}

    result = {}
    parents1 = get_parent_place(dcids)
    dcids = dcids.split('^')
    dcid_parents1_mapping = {}
    for dcid in dcids:
        first_parents = parents1[dcid]
        result[dcid] = first_parents
        if first_parents:
            dcid_parents1_mapping[dcid] = first_parents[-1]['dcid']
    if not dcid_parents1_mapping:
        return result

    parents2 = get_parent_place('^'.join(dcid_parents1_mapping.values()))
    dcid_parents2_mapping = {}
    for dcid in dcid_parents1_mapping.keys():
        second_parents = parents2[dcid_parents1_mapping[dcid]]
        result[dcid].extend(second_parents)
        if second_parents:
            dcid_parents2_mapping[dcid] = second_parents[-1]['dcid']
    if not dcid_parents2_mapping:
        return result

    parents3 = get_parent_place('^'.join(dcid_parents2_mapping.values()))
    for dcid in dcid_parents2_mapping.keys():
        result[dcid].extend(parents3[dcid_parents2_mapping[dcid]])
        result[dcid] = [x for x in result[dcid] if x['dcid'] != 'Earth']
    return result


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_parent_place(dcids):
    """ Get containedInPlace for each place in a list of places

    Args:
        dcids: ^ separated string of dcids. It must be a single string for the cache.

    Returns:
        A dictionary of lists of containedInPlace, keyed by dcid.
    """
    if dcids:
        dcids = dcids.split('^')
    else:
        dcids = []
    response = fetch_data('/node/property-values', {
        'dcids': dcids,
        'property': 'containedInPlace',
        'direction': 'out'
    },
                          compress=False,
                          post=True)
    result = {}
    for dcid in dcids:
        parents = response[dcid].get('out', [])
        parents.sort(key=lambda x: x['dcid'], reverse=True)
        for i in range(len(parents)):
            if len(parents[i]['types']) > 1:
                parents[i]['types'] = [
                    x for x in parents[i]['types']
                    if not x.startswith('AdministrativeArea')
                ]
        result[dcid] = parents
    return result


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

    result = {
        'left': left - margin * x_spread,
        'right': right + margin * x_spread,
        'up': up + margin * y_spread,
        'down': down - margin * y_spread,
        'coordinateSequenceSet': coordinate_sequence_set
    }
    return Response(json.dumps(result), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_related_place(dcid,
                      stats_vars_string,
                      within_place=None,
                      is_per_capita=None):
    stats_vars = stats_vars_string.split('^')

    return dc.get_related_place(dcid,
                                stats_vars,
                                within_place=within_place,
                                is_per_capita=is_per_capita)


def get_ranking_url(containing_dcid,
                    place_type,
                    stat_var,
                    highlight_dcid,
                    is_per_capita=False):
    url = url_for(
        'ranking.ranking',
        stat_var=stat_var,
        place_type=place_type,
        place_dcid=containing_dcid,
        h=highlight_dcid,
    )
    if is_per_capita:
        url = url + "&pc"
    return url


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/ranking/<path:dcid>')
def api_ranking(dcid):
    """
    Get the ranking information for a given place.
    """
    current_place_type = get_place_type(dcid)
    parents = parent_places(dcid)[dcid]
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
    # Crime stats var is separted from RANKING_STATS as it uses perCapita
    # option.
    # TOOD(shifucun): merge this once https://github.com/datacommonsorg/mixer/issues/262 is fixed.
    crime_statsvar = {
        'Count_CriminalActivities_CombinedCrime': 'Highest Crime Per Capita'
    }
    for parent_dcid in selected_parents:
        stats_var_string = '^'.join(RANKING_STATS.keys())
        response = get_related_place(dcid,
                                     stats_var_string,
                                     within_place=parent_dcid)
        for stats_var, data in response.items():
            result[RANKING_STATS[stats_var]].append({
                'name':
                    parent_names[parent_dcid],
                'data':
                    data,
                'rankingUrl':
                    get_ranking_url(parent_dcid, current_place_type, stats_var,
                                    dcid)
            })
        response = get_related_place(dcid,
                                     '^'.join(crime_statsvar.keys()),
                                     within_place=parent_dcid,
                                     is_per_capita=True)
        for stats_var, data in response.items():
            result[crime_statsvar[stats_var]].append({
                'name':
                    parent_names[parent_dcid],
                'data':
                    data,
                'rankingUrl':
                    get_ranking_url(parent_dcid,
                                    current_place_type,
                                    stats_var,
                                    dcid,
                                    is_per_capita=True)
            })

    all_labels = list(RANKING_STATS.values()) + \
        list(crime_statsvar.values())
    for label in all_labels:
        if label in result:
            result[label] = [x for x in result[label] if 'data' in x]
    result['label'] = [x for x in all_labels if x in result]
    return Response(json.dumps(result), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_state_code(dcids):
    """Get state codes for a list of places that are state equivalents

    Args:
        dcids: ^ separated string of dcids of places that are state equivalents

    Returns:
        A dictionary of state codes, keyed by dcid
    """
    result = {}
    if not dcids:
        return result
    dcids = dcids.split('^')
    iso_codes = dc.get_property_values(dcids, 'isoCode', True)

    for dcid in dcids:
        state_code = None
        iso_code = iso_codes[dcid]
        if iso_code:
            split_iso_code = iso_code[0].split("-")
            if len(split_iso_code
                  ) > 1 and split_iso_code[0] == US_ISO_CODE_PREFIX:
                state_code = split_iso_code[1]
        result[dcid] = state_code

    return result


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_display_name(dcids):
    """ Get display names for a list of places. Display name is place name with state code
    if it has a parent place that is a state.

    Args:
        dcids: ^ separated string of dcids. It must be a single string for the cache.

    Returns:
        A dictionary of display names, keyed by dcid.
    """
    place_names = cached_name(dcids)
    parents = parent_places(dcids)
    dcids = dcids.split('^')
    result = {}
    dcid_state_mapping = {}
    for dcid in dcids:
        for parent_place in parents[dcid]:
            parent_dcid = parent_place['dcid']
            place_types = parent_place['types']
            for place_type in place_types:
                if place_type in STATE_EQUIVALENTS:
                    dcid_state_mapping[dcid] = parent_dcid
                    break
        result[dcid] = place_names[dcid]

    state_codes = get_state_code('^'.join(
        (sorted(dcid_state_mapping.values()))))
    for dcid in dcid_state_mapping.keys():
        state_code = state_codes[dcid_state_mapping[dcid]]
        if state_code:
            result[dcid] = result[dcid] + ', ' + state_code
    return result


@bp.route('/displayname')
def api_display_name():
    """
    Get display names for a list of places.
    """
    dcids = request.args.getlist('dcid')
    result = get_display_name('^'.join((sorted(dcids))))
    return Response(json.dumps(result), 200, mimetype='application/json')
