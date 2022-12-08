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
"""Endpoints for disaster dashboard"""

from flask import Blueprint
import services.datacommons as dc
import json
import os
import flask

# Define blueprint
bp = Blueprint("disasters", __name__, url_prefix='/disasters')


@bp.route('/v0')
def disaster_dashboard():
  if not os.environ.get('FLASK_ENV') in [
      'autopush', 'local', 'dev', 'local-stanford', 'stanford'
  ]:
    flask.abort(404)
  european_countries = json.dumps(
      dc.get_places_in(["europe"], "Country").get("europe", []))
  return flask.render_template('custom_dc/stanford/disaster_dashboard.html',
                               european_countries=european_countries)
