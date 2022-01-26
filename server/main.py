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
import requests
import sys
import threading
import time

import flask
from flask import request

import services.datacommons as dc
from lib import translator

from __init__ import create_app

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(lineno)d : %(message)s')
app = create_app()
app.jinja_env.globals['GA_ACCOUNT'] = app.config['GA_ACCOUNT']
app.jinja_env.globals['FEEDING_AMERICA'] = app.config['FEEDING_AMERICA']
app.jinja_env.globals['SUSTAINABILITY'] = app.config['SUSTAINABILITY']
app.jinja_env.globals['NAME'] = app.config['NAME']
app.jinja_env.globals['BASE_HTML'] = (
    'sustainability/base.html' if app.config['SUSTAINABILITY'] else 'base.html')

_MAX_SEARCH_RESULTS = 1000

WARM_UP_ENDPOINTS = [
    "/api/choropleth/geojson?placeDcid=country/USA&placeType=County",
    "/api/place/parent/country/USA",
    "/api/place/places-in-names?dcid=country/USA&placeType=County",
    "/api/stats/set/series/within-place?parent_place=country/USA&child_type=County&stat_vars=Count_Person",
]


def send_warmup_requests():
    logging.info("Sending warm up requests:")
    for endpoint in WARM_UP_ENDPOINTS:
        while True:
            try:
                resp = requests.get("http://127.0.0.1:8080" + endpoint)
                if resp.status_code == 200:
                    break
            except:
                pass
            time.sleep(1)


@app.before_request
def before_request():
    scheme = request.headers.get('X-Forwarded-Proto')
    if scheme and scheme == 'http' and request.url.startswith('http://'):
        url = request.url.replace('http://', 'https://', 1)
        code = 301
        return flask.redirect(url, code=code)


# TODO(beets): Move this to a separate handler so it won't be installed on all apps.
@app.route('/translator')
def translator_handler():
    return flask.render_template('translator.html',
                                 schema_mapping=translator.SCHEMA_MAPPING,
                                 sample_query=translator.SAMPLE_QUERY)


# TODO(beets): Move this to a separate handler so it won't be installed on all apps.
@app.route('/search')
def search():
    return flask.render_template('search.html')


@app.route('/healthz')
def healthz():
    return "very healthy"


# TODO(beets): Move this to a separate handler so it won't be installed on all apps.
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


# TODO(beets): Move this to a separate handler so it won't be installed on all apps.
@app.route('/weather')
def get_weather():
    dcid = request.args.get('dcid')
    prop = request.args.get('prop')
    period = request.args.get('period')
    if not dcid:
        flask.abort(400, 'Missing url parameter "dcid"')
    if not prop:
        flask.abort(400, 'Missing url parameter "prop"')
    if not period:
        flask.abort(400, 'Missing url parameter "period"')

    query_string = ('SELECT ?date ?mean ?unit ?provId '
                    'WHERE {{'
                    ' ?o typeOf {period}WeatherObservation .'
                    ' ?o observedNode {dcid} .'
                    ' ?o measuredProperty {prop} .'
                    ' ?o observationDate ?date .'
                    ' ?o unit ?unit .'
                    ' ?o meanValue ?mean .'
                    ' ?o provenance ?provId .}}').format(period=period,
                                                         dcid=dcid,
                                                         prop=prop)

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
            'provId': row['cells'][3]['value'],
        })
    return json.dumps(observations)


# TODO(beets): Move this to a separate handler so it won't be installed on all apps.
@app.route('/mcf_playground')
def mcf_playground():
    return flask.render_template('mcf_playground.html')


# TODO(shifucun): get branch cache version from mixer
@app.route('/version')
def version():
    mixer_version = dc.version()

    return flask.render_template('version.html',
                                 website_hash=os.environ.get("WEBSITE_HASH"),
                                 mixer_hash=mixer_version['gitHash'],
                                 base_tables=mixer_version['baseTables'],
                                 branch_table=mixer_version['branchTable'],
                                 bigquery=mixer_version['bigQuery'])


if not (app.config["TEST"] or app.config["WEBDRIVER"] or app.config["LOCAL"]):
    thread = threading.Thread(target=send_warmup_requests)
    thread.start()

if __name__ == '__main__':
    # This is used when running locally only. When deploying to GKE,
    # a webserver process such as Gunicorn will serve the app.
    logging.info("Run web server in local mode")
    port = sys.argv[1] if len(sys.argv) >= 2 else 8080
    app.run(host='127.0.0.1', port=port, debug=True)
