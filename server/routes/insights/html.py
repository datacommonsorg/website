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
"""Data Commons Insights routes"""

import os

import flask
from flask import Blueprint
from flask import current_app
from flask import render_template

bp = Blueprint('insights', __name__, url_prefix='/insights')


@bp.route('/')
def page():
  # No production support yet.
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)

  return render_template('/insights.html',
                         maps_api_key=current_app.config['MAPS_API_KEY'],
                         website_hash=os.environ.get("WEBSITE_HASH"))
