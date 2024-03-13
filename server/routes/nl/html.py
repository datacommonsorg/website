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
"""Data Commons NL Interface routes"""

import json
import os

import flask
from flask import Blueprint
from flask import current_app
from flask import g
from flask import render_template

bp = Blueprint('nl', __name__, url_prefix='/nl')


@bp.route('/')
def page():
  placeholder_query = ''
  # TODO: Make this more customizable for all custom DC's
  if g.env == 'climate_trace':
    placeholder_query = 'Greenhouse gas emissions in USA'
  return render_template('/nl_interface.html',
                         maps_api_key=current_app.config['MAPS_API_KEY'],
                         placeholder_query=placeholder_query,
                         index_type="",
                         website_hash=os.environ.get("WEBSITE_HASH"))


@bp.route('/sdg')
def sdg_page():
  placeholder_query = ''
  return render_template('/nl_interface.html',
                         maps_api_key=current_app.config['MAPS_API_KEY'],
                         placeholder_query=placeholder_query,
                         index_type="sdg_ft",
                         website_hash=os.environ.get("WEBSITE_HASH"))


@bp.route('/eval')
def eval_page():
  if not current_app.config['VERTEX_AI_MODELS']:
    flask.abort(404)

  model_names = list(current_app.config['VERTEX_AI_MODELS'].keys())
  eval_file = os.path.join(os.path.dirname(current_app.root_path),
                           'shared/eval/base/golden.json')
  with open(eval_file) as f:
    return render_template('/nl_eval.html',
                           model_names=json.dumps(model_names),
                           eval_golden=json.dumps(json.load(f)))
