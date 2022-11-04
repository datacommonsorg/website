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

import logging
import os
import requests
import sys
import threading
import time

import flask
from flask import request

import services.datacommons as dc

from __init__ import create_app

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(lineno)d : %(message)s')

app = create_app()
app.jinja_env.globals['GA_ACCOUNT'] = app.config['GA_ACCOUNT']
app.jinja_env.globals['NAME'] = app.config['NAME']
app.jinja_env.globals['BASE_HTML'] = app.config['BASE_HTML_PATH']
app.secret_key = os.urandom(24)

WARM_UP_ENDPOINTS = [
    "/api/choropleth/geojson?placeDcid=country/USA&placeType=County",
    "/api/place/parent/country/USA",
    "/api/place/places-in-names?dcid=country/USA&placeType=County",
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
    return flask.render_template('translator.html')


@app.route('/healthz')
def healthz():
    return "very healthy"


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
                                 tables=mixer_version['tables'],
                                 bigquery=mixer_version['bigquery'])


if not (app.config["TEST"] or app.config["WEBDRIVER"] or app.config["LOCAL"]):
    thread = threading.Thread(target=send_warmup_requests)
    thread.start()

if __name__ == '__main__':
    # This is used when running locally only. When deploying to GKE,
    # a webserver process such as Gunicorn will serve the app.
    logging.info("Run web server in local mode")
    port = sys.argv[1] if len(sys.argv) >= 2 else 8080
    app.run(host='127.0.0.1', port=port, debug=True)
