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

import flask
import os

from flask import current_app, request

bp = flask.Blueprint("tools", __name__, url_prefix='/tools')

# this flag should be the same as ALLOW_LEAFLET_URL_ARG in
# ../../static/js/tools/map/util.ts
ALLOW_LEAFLET_FLAG = "leaflet"


@bp.route('/timeline')
def timeline():
    return flask.render_template(
        'tools/timeline.html',
        info_json="private_dc/default/timeline_examples.json",
        maps_api_key=current_app.config['MAPS_API_KEY'])


# This tool is used by the Harvard Data Science course
@bp.route('/timeline/bulk_download')
def timeline_bulk_download():
    return flask.render_template('tools/timeline_bulk_download.html')


@bp.route('/map')
def map():
    allow_leaflet = request.args.get(ALLOW_LEAFLET_FLAG, None)
    return flask.render_template(
        'tools/map.html',
        maps_api_key=current_app.config['MAPS_API_KEY'],
        info_json="private_dc/default/map_examples.json",
        allow_leaflet=allow_leaflet)


@bp.route('/scatter')
def scatter():
    return flask.render_template(
        'tools/scatter.html',
        info_json="private_dc/default/scatter_examples.json",
        maps_api_key=current_app.config['MAPS_API_KEY'])


@bp.route('/statvar')
def stat_var():
    return flask.render_template('tools/stat_var.html')


@bp.route('/download')
def download():
    return flask.render_template(
        'tools/download.html', maps_api_key=current_app.config['MAPS_API_KEY'])
