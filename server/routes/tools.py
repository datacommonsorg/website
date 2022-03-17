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

from flask import current_app

bp = flask.Blueprint("tools", __name__, url_prefix='/tools')


@bp.route('/rich_search')
def rich_search():
    if os.environ.get('FLASK_ENV') == 'production':
        flask.abort(404)
    return flask.render_template(
        'tools/rich_search.html',
        maps_api_key=current_app.config['MAPS_API_KEY'])


@bp.route('/timeline')
def timeline():
    return flask.render_template(
        'tools/timeline.html', maps_api_key=current_app.config['MAPS_API_KEY'])


# This tool is used by the Harvard Data Science course
@bp.route('/timeline/bulk_download')
def timeline_bulk_download():
    return flask.render_template('tools/timeline_bulk_download.html')


@bp.route('/map')
def map():
    return flask.render_template(
        'tools/map.html', maps_api_key=current_app.config['MAPS_API_KEY'])


@bp.route('/scatter')
def scatter():
    return flask.render_template(
        'tools/scatter.html', maps_api_key=current_app.config['MAPS_API_KEY'])


@bp.route('/statvar')
def stat_var():
    return flask.render_template('tools/stat_var.html')
