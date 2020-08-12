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

"""Main entry module specified in app.yaml.

This module contains the request handler codes and the main app.
"""

import collections
import json
import logging
import os

import flask
from flask import request, redirect, url_for

import services.datacommons as dc
from lib import translator
from routes.api.place import parent_place

from __init__ import create_app
from cache import cache


logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s %(lineno)d : %(message)s')


app = create_app()

GCS_BUCKET = app.config['GCS_BUCKET']
_MAX_SEARCH_RESULTS = 1000

# Contains statistical variable and the display name used for place rankings.
RANKING_STATS = {
    'Count_Person': 'Population',
    'Median_Income_Person': 'Median Income',
    'Median_Age_Person': 'Median Age',
    'UnemploymentRate_Person': 'Unemployment Rate',
}


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_property_value(dcid, prop, out=True):
    return dc.get_property_values([dcid], prop, out)[dcid]


@app.route('/place')
def place():
    place_dcid = request.args.get('dcid')
    if not place_dcid:
        return redirect(url_for('place', dcid='country/USA'))
    place_types = get_property_value(place_dcid, 'typeOf')
    # We prefer to use specific type like "State", "County" over "AdministrativeArea"
    chosen_type = None
    for place_type in place_types:
        if not chosen_type or chosen_type.startswith('AdministrativeArea'):
            chosen_type = place_type
    place_names = get_property_value(place_dcid, 'name')
    if place_names:
        place_name = place_names[0]
    else:
        place_name = place_dcid
    topic = request.args.get('topic', '')
    return flask.render_template(
        'place.html',
        place_type=chosen_type,
        place_name=place_name,
        place_dcid=place_dcid,
        topic=topic)


@cache.cached(timeout=3600 * 24)
@app.route('/api/placeid2dcid/<path:placeid>')
def api_placeid2dcid(placeid):
    """
    API endpoint to get dcid based on place id.

    This is to use together with the Google Maps Autocomplete API:
    https://developers.google.com/places/web-service/autocomplete.
    """
    if placeid in app.config['PLACEID2DCID']:
        return app.config['PLACEID2DCID'][placeid]
    else:
        flask.abort('dcid not found for %s' % placeid, 404)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/mapinfo/<path:dcid>')
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
        coordinates = coordinate_group.replace(
            '<coordinates>', '').replace('</coordinates>', '').split(' ')
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
def get_related_place(
        dcid, stats_vars_string, same_place_type=None, within_place=None,
        is_per_capita=None):
    stats_vars = stats_vars_string.split('^')

    return dc.get_related_place(
        dcid, stats_vars, same_place_type=same_place_type,
        within_place=within_place, is_per_capita=is_per_capita)


# TODO(boxu): move this to route.place module.
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/similar-place/<stats_var>/<path:dcid>')
def api_similar_places(stats_var, dcid):
    """
    Get the similar places for a given place by stats var.
    """
    return dc.get_related_place(
        dcid, [stats_var], same_place_type=True).get(stats_var, {})


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/interesting-place/<path:dcid>')
def api_interesting_places(dcid):
    """
    Get the intersting places for a given place.
    """
    return dc.get_interesting_places([dcid])


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/nearby-place/<path:dcid>')
def api_nearby_places(dcid):
    """
    Get the nearby places for a given place.
    """
    req_json = {'dcids': [dcid],
                'property': 'nearbyPlaces', 'direction': 'out'}
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
    data = dc.get_property_values(dcids, 'typeOf', True)
    return json.dumps(data)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/ranking/<path:dcid>')
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
        response = get_related_place(
            dcid, stats_var_string, same_place_type=True, within_place=parent)
        for stats_var, data in response.items():
            result[RANKING_STATS[stats_var]].append(
                {'name': parent_names[parent], 'data': data})

        # Crime stats var is separted from RANKING_STATS as it uses perCapita
        # option.
        # TOOD(shifucun): merge this once https://github.com/datacommonsorg/mixer/issues/262 is fixed.
        crime_statsvar = {
            'Count_CriminalActivities_CombinedCrime': 'Crime per capita'}
        response = get_related_place(
            dcid, '^'.join(crime_statsvar.keys()), same_place_type=True,
            within_place=parent, is_per_capita=True)
        for stats_var, data in response.items():
            result[crime_statsvar[stats_var]].append(
                {'name': parent_names[parent], 'data': data})

    result['label'] = list(RANKING_STATS.values()) + \
        list(crime_statsvar.values())
    for label in result['label']:
        result[label] = [x for x in result[label] if x['data']]
    result['label'] = [x for x in result['label'] if result[x]]
    return result


@app.route('/translator')
def translator_handler():
    return flask.render_template(
        'translator.html',
        schema_mapping=translator.SCHEMA_MAPPING,
        sample_query=translator.SAMPLE_QUERY)


@app.route('/search')
def search():
    return flask.render_template('search.html')


@app.route('/search_dc')
def search_dc():
    """Add DC API powered search for non-place searches temporarily"""
    query_text = request.args.get('q', '')
    max_results = int(request.args.get('l', _MAX_SEARCH_RESULTS))
    search_response = dc.search(query_text, max_results)

    # Convert from search results to template dictionary.
    results = []
    query_tokens = set(query_text.lower().split())
    for section in search_response.get('section', []):
        entities = []
        for search_entity in section['entity']:
            entity = {}
            entity['name'] = search_entity['name']
            entity['dcid'] = search_entity['dcid']
            name_tokens = search_entity['name'].lower().split()
            for i, t in enumerate(name_tokens):
                name_tokens[i] = t.strip("'")
            name_tokens = set(name_tokens)
            if not name_tokens & query_tokens:
                continue
            entity['rank'] = len(name_tokens & query_tokens) / len(name_tokens
                                                                   | query_tokens)
            entities.append(entity)
        entities = sorted(entities, key=lambda e: (e['rank']), reverse=True)
        if entities:
            results.append({
                'type': section['typeName'],
                'entities': entities,
            })
    return flask.render_template('search_dc.html', query_text=query_text, results=results)


@app.route('/weather')
def get_weather():
    dcid = request.args.get('dcid')
    prop = request.args.get('prop')
    if not dcid:
        flask.abort('Missing url parameter "dcid"', 400)
    if not prop:
        flask.abort('Missing url parameter "prop"', 400)

    query_string = ('SELECT ?date ?mean ?unit '
                    'WHERE {{'
                    ' ?o typeOf WeatherObservation .'
                    ' ?o observedNode {dcid} .'
                    ' ?o measuredProperty {prop} .'
                    ' ?o observationDate ?date .'
                    ' ?o unit ?unit .'
                    ' ?o meanValue ?mean .}}').format(
        dcid=dcid, prop=prop)

    _, rows = dc.query(query_string)

    observations = []
    for row in rows:
        date = row['cells'][0]['value']
        if date < '2000':
            continue
        text = 'mean {}: {} {}'.format(prop, row['cells'][1]['value'],
                                       row['cells'][2]['value'])
        observations.append({
            'measuredProperty': prop,
            'observationDate': date,
            'meanValue': row['cells'][1]['value'],
            'unit': row['cells'][2]['value'],
            'text': text,
        })
    return json.dumps(observations)


@app.route('/mcf_playground')
def mcf_playground():
    return flask.render_template('mcf_playground.html')


if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)

# [END gae_python37_app]
