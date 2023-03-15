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
"""Import Wizard routes"""

import os

import flask
from flask import Blueprint
from flask import render_template

bp = Blueprint('import_wizard', __name__, url_prefix='/import')


@bp.route('/')
def main():
  return render_template('/import_wizard.html')


@bp.route('/new')
def main_new():
  if os.environ.get('FLASK_ENV') == 'production' or os.environ.get(
      'FLASK_ENV') == 'staging':
    flask.abort(404)
  return render_template('/import_wizard2.html')
