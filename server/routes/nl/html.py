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

import flask
from flask import Blueprint
from flask import current_app
from flask import render_template

import server.services.datacommons as dc

bp = Blueprint('nl', __name__, url_prefix='/nl')


@bp.route('/eval/embeddings')
def eval_embeddings():
  if not current_app.config.get('ENABLE_EMBEDDINGS_PLAYGROUND', False):
    flask.abort(404)
  server_config = dc.nl_server_config()
  return render_template('/eval_embeddings.html',
                         server_config=json.dumps(server_config))
