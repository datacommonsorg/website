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
from flask import redirect
from flask import render_template
from flask import request
from flask import url_for

import server.services.datacommons as dc

bp = Blueprint('nl', __name__, url_prefix='/nl')

_TEST_SHEET_ID = '1egx7AzQ47wxxQL_7oawWnnD-oIblx1i9xGmjslabZic'


@bp.route('/eval/embeddings')
def eval_embeddings():
  if os.environ.get('FLASK_ENV') not in ['local', 'test', 'autopush']:
    flask.abort(404)
  server_config = dc.nl_server_config()
  eval_file = os.path.join(os.path.dirname(current_app.root_path),
                           'shared/eval/base/golden.json')
  with open(eval_file) as f:
    return render_template('/eval_embeddings.html',
                           server_config=json.dumps(server_config),
                           eval_golden=json.dumps(json.load(f)))


@bp.route('/eval/rig')
def eval_rig():
  return redirect(url_for('nl.eval_retrieval_generation'), code=302)


@bp.route('/eval/retrieval_generation')
def eval_retrieval_generation():
  if os.environ.get('FLASK_ENV') not in ['local', 'autopush']:
    flask.abort(404)
  sheet_id = request.args.get('sheet_id')
  if not sheet_id:
    return redirect(url_for('nl.eval_retrieval_generation',
                            sheet_id=_TEST_SHEET_ID),
                    code=302)
  return render_template('/eval_retrieval_generation.html', sheet_id=sheet_id)
