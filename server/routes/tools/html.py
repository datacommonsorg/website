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

import json
import os

import flask
from flask import current_app
from flask import g
from flask import request

bp = flask.Blueprint("tools", __name__, url_prefix='/tools')

# this flag should be the same as ALLOW_LEAFLET_URL_ARG in
# ../../static/js/tools/map/util.ts
ALLOW_LEAFLET_FLAG = "leaflet"


def get_example_file(tool):
  example_file = os.path.join(current_app.root_path, 'templates/custom_dc',
                              g.env, '{}_examples.json'.format(tool))
  if os.path.exists(example_file):
    return example_file

  return os.path.join(current_app.root_path,
                      'templates/tools/{}_examples.json'.format(tool))


@bp.route('/timeline')
def timeline():
  with open(get_example_file('timeline')) as f:
    info_json = json.load(f)
    return flask.render_template(
        'tools/timeline.html',
        info_json=info_json,
        maps_api_key=current_app.config['MAPS_API_KEY'])


# This tool is used by the Harvard Data Science course
@bp.route('/timeline/bulk_download')
def timeline_bulk_download():
  return flask.render_template('tools/timeline_bulk_download.html')


@bp.route('/map')
def map():
  allow_leaflet = request.args.get(ALLOW_LEAFLET_FLAG, None)
  with open(get_example_file('map')) as f:
    info_json = json.load(f)
    return flask.render_template(
        'tools/map.html',
        maps_api_key=current_app.config['MAPS_API_KEY'],
        info_json=info_json,
        allow_leaflet=allow_leaflet)


@bp.route('/scatter')
def scatter():
  with open(get_example_file('scatter')) as f:
    info_json = json.load(f)
    return flask.render_template(
        'tools/scatter.html',
        info_json=info_json,
        maps_api_key=current_app.config['MAPS_API_KEY'])


@bp.route('/statvar')
def stat_var():
  return flask.render_template('tools/stat_var.html')


@bp.route('/download')
def download():
  # List of DCIDs displayed in the info page for download tool
  # NOTE: EXACTLY 2 EXAMPLES REQUIRED.
  with open(get_example_file('download')) as f:
    info_places = json.load(f)
    return flask.render_template(
        'tools/download.html',
        info_places=json.dumps(info_places),
        maps_api_key=current_app.config['MAPS_API_KEY'])


@bp.route('/visualization')
def visualization():
  if current_app.config['HIDE_REVAMP_CHANGES']:
    flask.abort(404)

  with open(get_example_file('visualization')) as f:
    info_json = json.load(f)
    return flask.render_template(
        'tools/visualization.html',
        info_json=info_json,
        maps_api_key=current_app.config['MAPS_API_KEY'])
