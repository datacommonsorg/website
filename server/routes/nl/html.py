# Copyright 2024 Google LLC
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
"""Data Commons NL Experimentation routes"""

import json
import os

import flask
from flask import Blueprint
from flask import current_app
from flask import render_template

import server.services.datacommons as dc

bp = Blueprint('nl', __name__, url_prefix='/nl')


@bp.route('/eval')
def eval_page():
  if os.environ.get('FLASK_ENV') not in ['local', 'test', 'autopush']:
    flask.abort(404)
  server_config = dc.nl_server_config()
  eval_file = os.path.join(os.path.dirname(current_app.root_path),
                           'shared/eval/base/golden.json')
  with open(eval_file) as f:
    return render_template('/nl_eval.html',
                           server_config=json.dumps(server_config),
                           eval_golden=json.dumps(json.load(f)))
