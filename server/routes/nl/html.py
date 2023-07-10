# Copyright 2023 Google LLC
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
"""Data Commons NL Interface routes"""

import os

import flask
from flask import Blueprint
from flask import current_app
from flask import g
from flask import render_template

bp = Blueprint('nl', __name__, url_prefix='/nl')


@bp.route('/')
def page():
  if (os.environ.get('FLASK_ENV') == 'production' or
      not current_app.config['NL_MODEL']):
    flask.abort(404)
  placeholder_query = ''
  # TODO: Make this more customizable for all custom DC's
  if g.env == 'climate_trace':
    placeholder_query = 'Greenhouse gas emissions in USA'
  return render_template('/nl_interface.html',
                         maps_api_key=current_app.config['MAPS_API_KEY'],
                         placeholder_query=placeholder_query,
                         website_hash=os.environ.get("WEBSITE_HASH"))
