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

bp = flask.Blueprint("tools", __name__, url_prefix='/tools')


@bp.route('/timeline')
def timeline():
    return flask.render_template('tools/timeline.html')


@bp.route('/scatter')
def scatter():
    return flask.render_template('tools/scatter.html')


@bp.route('/choropleth')
def choropleth():
    # TODO(iancostello): Permit production use after development finishes.
    if os.environ.get('FLASK_ENV') == 'production':
        flask.abort(404)
    return flask.render_template('tools/choropleth.html')

@bp.route('/scatter2')
def scatter2():
    # TODO(intrepiditee): Permit production use after development finishes.
    if os.environ.get('FLASK_ENV') == 'production':
        flask.abort(404)
    return flask.render_template('tools/scatter2.html')

