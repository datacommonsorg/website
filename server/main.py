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

import json
import logging
import os

import flask
from flask import request

import services.datacommons as dc
from lib import translator

from __init__ import create_app
from cache import cache

logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s %(levelname)s %(lineno)d : %(message)s')

app = create_app()
app.jinja_env.globals['GA_ACCOUNT'] = app.config['GA_ACCOUNT']

GCS_BUCKET = app.config['GCS_BUCKET']
_MAX_SEARCH_RESULTS = 1000


@app.before_request
def before_request():
    scheme = request.headers.get('X-Forwarded-Proto')
    if scheme and scheme == 'http' and request.url.startswith('http://'):
        url = request.url.replace('http://', 'https://', 1)
        code = 301
        return flask.redirect(url, code=code)


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
        flask.abort(404, 'dcid not found for %s' % placeid)


@app.route('/translator')
def translator_handler():
    return flask.render_template('translator.html',
                                 schema_mapping=translator.SCHEMA_MAPPING,
                                 sample_query=translator.SAMPLE_QUERY)


@app.route('/search')
def search():
    return flask.render_template('search.html')


@app.route('/healthz')
def healthz():
    return "very healthy"


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
            entity['rank'] = len(name_tokens & query_tokens) / len(name_tokens |
                                                                   query_tokens)
            entities.append(entity)
        entities = sorted(entities, key=lambda e: (e['rank']), reverse=True)
        if entities:
            results.append({
                'type': section['typeName'],
                'entities': entities,
            })
    return flask.render_template('search_dc.html',
                                 query_text=query_text,
                                 results=results)


@app.route('/weather')
def get_weather():
    dcid = request.args.get('dcid')
    prop = request.args.get('prop')
    if not dcid:
        flask.abort(400, 'Missing url parameter "dcid"')
    if not prop:
        flask.abort(400, 'Missing url parameter "prop"')

    query_string = ('SELECT ?date ?mean ?unit '
                    'WHERE {{'
                    ' ?o typeOf WeatherObservation .'
                    ' ?o observedNode {dcid} .'
                    ' ?o measuredProperty {prop} .'
                    ' ?o observationDate ?date .'
                    ' ?o unit ?unit .'
                    ' ?o meanValue ?mean .}}').format(dcid=dcid, prop=prop)

    _, rows = dc.query(query_string)

    observations = []
    for row in rows:
        if ('value' not in row['cells'][0] or 'value' not in row['cells'][1] or
                'value' not in row['cells'][2]):
            continue
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


# TODO(shifucun): get branch cache version from mixer
@app.route('/version')
def version():
    return flask.render_template('version.html',
                                 website_hash=os.environ.get("WEBSITE_HASH"),
                                 mixer_hash=os.environ.get("MIXER_HASH"),
                                 bigtable=os.environ.get("BIG_TABLE"),
                                 bigquery=os.environ.get("BIG_QUERY"))


if __name__ == '__main__':
    # This is used when running locally only. When deploying to GKE,
    # a webserver process such as Gunicorn will serve the app.
    app.run(host='127.0.0.1', port=8080, debug=True)
