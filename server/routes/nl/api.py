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
"""Endpoints for Datacommons NL Experimentation"""

import json

import flask
from flask import Blueprint
from flask import request

from server.services import datacommons as dc

bp = Blueprint('nl_api', __name__, url_prefix='/api/nl')


@bp.route('/encode-vector', methods=['POST'])
def encode_vector():
  """Retrieves the embedding vector for a given query and model.
  """
  model = request.args.get('model')
  queries = request.json.get('queries', [])
  return json.dumps(dc.nl_encode(model, queries))


@bp.route('/search-vector', methods=['POST'])
def search_vector():
  """Performs vector search for a given query and embedding index.
  """
  idx = request.args.get('idx')
  if not idx:
    flask.abort(400, 'Must provide an `idx`')
  queries = request.json.get('queries')
  if not queries:
    flask.abort(400, 'Must provide a `queries` in POST data')

  return dc.nl_search_vars(queries, idx.split(','))
