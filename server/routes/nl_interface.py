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
"""Data Commons NL Interface routes"""

import os

from flask import current_app
import flask
from flask import Blueprint, render_template

import services.datacommons as dc

bp = Blueprint('nl', __name__, url_prefix='/nl')


@bp.route('/<path:dcid>')
def page(dcid):
  if os.environ.get('FLASK_ENV') == 'production':
    flask.abort(404)
  model = current_app.config['NL_MODEL']
  scores, svs = model.search('people who cannot see')
  place_page_data = dc.get_landing_page_data(dcid, 'Overview', [])
  svg_info = dc.get_variable_group_info("Count_Person", [])
  # Process data as needed
  # Fetch other data using dc.xxxx
  return render_template('/nl.html')