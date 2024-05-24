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

from dataclasses import asdict
import json
import logging
from typing import List

from flask import Blueprint
from flask import current_app
from flask import request
from markupsafe import escape

from nl_server import registry
from nl_server import search
from nl_server.embeddings import Embeddings
from nl_server.registry import Registry
from nl_server.registry import REGISTRY_KEY
from shared.lib import constants
from shared.lib.detected_variables import var_candidates_to_dict

bp = Blueprint('main', __name__, url_prefix='/')

#
# A global bool to ensure we keep failing healthz till we
# load the default embeddings fully on the server.
#
default_embeddings_loaded = False


@bp.route('/healthz')
def healthz():
  return 'NL Server is healthy', 200


@bp.route('/api/search_vars/', methods=['POST'])
def search_vars():
  """Returns a dictionary with each input query as key and value as:

  {
    'SV': List[str]
    'CosineScore': List[float],
    'SV_to_Sentences': Dict[str, str]
  }
  """
  queries = request.json.get('queries', [])
  queries = [str(escape(q)) for q in queries]

  skip_topics = False
  if request.args.get('skip_topics'):
    skip_topics = True

  r: Registry = current_app.config[REGISTRY_KEY]

  reranker_name = str(escape(request.args.get('reranker', '')))
  reranker_model = r.get_reranking_model(
      reranker_name) if reranker_name else None

  default_indexes = r.server_config().default_indexes
  idx_type_str = str(escape(request.args.get('idx', '')))
  if not idx_type_str:
    idx_types = default_indexes
  else:
    idx_types = idx_type_str.split(',')
  embeddings = _get_indexes(r, idx_types)

  debug_logs = {'sv_detection_query_index_type': idx_types}
  results = search.search_vars(embeddings, queries, skip_topics, reranker_model,
                               debug_logs)
  q2result = {q: var_candidates_to_dict(result) for q, result in results.items()}
  return json.dumps({
      'queryResults': q2result,
      'scoreThreshold': _get_threshold(embeddings),
      'debugLogs': debug_logs
  })


@bp.route('/api/detect_verbs/', methods=['GET'])
def detect_verbs():
  """Returns a list tokens that detected as verbs.

  List[str]
  """
  query = str(escape(request.args.get('q')))
  r: Registry = current_app.config[REGISTRY_KEY]
  return json.dumps(r.get_attribute_model().detect_verbs(query.strip()))


@bp.route('/api/server_config/', methods=['GET'])
def embeddings_version_map():
  r: Registry = current_app.config[REGISTRY_KEY]
  server_config = r.server_config()
  return json.dumps(asdict(server_config))


@bp.route('/api/load/', methods=['GET'])
def load():
  try:
    current_app.config[REGISTRY_KEY] = registry.build()
  except Exception as e:
    logging.error(f'Server registry not built due to error: {str(e)}')
  r: Registry = current_app.config[REGISTRY_KEY]
  server_config = r.server_config()
  return json.dumps(asdict(server_config))


def _get_indexes(r: Registry, idx_types: List[str]) -> List[Embeddings]:
  embeddings: List[Embeddings] = []
  for idx in idx_types:
    try:
      emb = r.get_index(idx)
      if emb:
        embeddings.append(emb)
    except Exception as e:
      logging.warning(f'Failed to load index {idx}: {e}')
  return embeddings


# NOTE: Custom DC embeddings addition needs to ensures that the
#       base vs. custom models do not use different thresholds
def _get_threshold(embeddings: List[Embeddings]) -> float:
  if embeddings:
    return embeddings[0].model.score_threshold
  return constants.SV_SCORE_DEFAULT_THRESHOLD
