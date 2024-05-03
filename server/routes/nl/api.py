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
from flask import current_app
from flask import request

from server.lib.cache import model_cache
from server.routes import TIMEOUT
import shared.model.api as model_api

bp = Blueprint('nl_api', __name__, url_prefix='/api/nl')


@bp.route('/encode-vector')
@model_cache.cached(timeout=TIMEOUT, query_string=True)
def encode_vector():
  """Retrieves the embedding vector for a given sentence and model.

    Valid model name can be found from `shared/model/vertex_ai_endpoints.yaml`
  """
  if not current_app.config['VERTEX_AI_MODELS']:
    flask.abort(404)
  sentence = request.args.get('sentence')
  model_name = request.args.get('modelName')
  return json.dumps(
      model_api.predict(current_app.config['VERTEX_AI_MODELS'][model_name],
                        [sentence]))


@bp.route('/vector-search')
@model_cache.cached(timeout=TIMEOUT, query_string=True)
def vector_search():
  """Performs vector search for a given sentence and model.

    Valid model name can be found from `shared/model/vertex_ai_endpoints.yaml`
  """
  if not current_app.config['VERTEX_AI_MODELS']:
    flask.abort(404)
  sentence = request.args.get('sentence')
  model_name = request.args.get('modelName')
  if not sentence:
    flask.abort(400, f'Bad sentence: {sentence}')
  if model_name not in current_app.config['VERTEX_AI_MODELS']:
    flask.abort(400, f'Bad model name: {model_name}')
  return model_api.vector_search(
      current_app.config['VERTEX_AI_MODELS'][model_name], sentence)
