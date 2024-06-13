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

from server.lib.cache import model_cache
from server.routes import TIMEOUT
from server.services import datacommons as dc

bp = Blueprint('nl_api', __name__, url_prefix='/api/nl')


@bp.route('/encode-vector')
@model_cache.cached(timeout=TIMEOUT, query_string=True)
def encode_vector():
  """Retrieves the embedding vector for a given query and model.
  """
  query = request.args.get('query')
  model = request.args.get('model')
  return json.dumps(dc.nl_encode(model, query))


@bp.route('/search-vector')
@model_cache.cached(timeout=TIMEOUT, query_string=True)
def search_vector():
  """Performs vector search for a given query and embedding index.
  """
  query = request.args.get('query')
  idx = request.args.get('idx')
  if not query:
    flask.abort(400, 'Must provde a `query`')
  if not idx:
    flask.abort(400, 'Must provde an `idx`')
  return dc.nl_search_vars([query], idx.split(','))
