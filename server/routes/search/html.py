# Copyright 2022 Google LLC
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
"""Data Commons search related routes."""

import flask
from flask import Blueprint
from flask import current_app
from flask import request

import server.services.datacommons as dc

bp = Blueprint('search', __name__)

_MAX_SEARCH_RESULTS = 1000


@bp.route('/search')
def search():
  """Custom search page"""
  query = request.args.get('q', '')
  return flask.render_template('search.html',
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               query=query)
