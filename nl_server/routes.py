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

from nl_server import config
from nl_server import loader
from nl_server import search
from nl_server.embeddings import Embeddings
from nl_server.registry import Registry
from shared.lib import constants
from shared.lib.custom_dc_util import is_custom_dc
from shared.lib.detected_variables import var_candidates_to_dict
from shared.lib.detected_variables import VarCandidates

bp = Blueprint('main', __name__, url_prefix='/')

#
# A global bool to ensure we keep failing healthz till we
# load the default embeddings fully on the server.
#
default_embeddings_loaded = False


@bp.route('/healthz')
def healthz():
  global default_embeddings_loaded

  if default_embeddings_loaded:
    return 'OK', 200

  default_index_type = current_app.config[config.ENV_KEY].default_indexes[0]
  if not default_index_type:
    logging.warning('Health Check Failed: Default index name empty!')
    return 'Service Unavailable', 500
  nl_embeddings: Embeddings = current_app.config[config.REGISTRY_KEY].get_index(
      default_index_type)
  if nl_embeddings:
    query = nl_embeddings.store.healthcheck_query
    result: VarCandidates = search.search_vars([nl_embeddings],
                                               [query]).get(query)
    if result and result.svs:
      default_embeddings_loaded = True
      return 'OK', 200
    else:
      logging.warning(f'Health Check Failed: query "{query}" failed!')
  else:
    logging.warning('Health Check Failed: Default index not yet loaded!')
  return 'Service Unavailable', 500


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

  default_index_type = current_app.config[config.ENV_KEY].default_indexes[0]
  idx = str(escape(request.args.get('idx', default_index_type)))
  if not idx:
    idx = default_index_type

  registry: Registry = current_app.config[config.REGISTRY_KEY]

  skip_topics = False
  if request.args.get('skip_topics'):
    skip_topics = True

  reranker_name = str(escape(request.args.get('reranker', '')))
  reranker_model = registry.get_reranking_model(
      reranker_name) if reranker_name else None

  nl_embeddings = _get_indexes(registry, idx)
  debug_logs = {'sv_detection_query_index_type': idx}
  results = search.search_vars(nl_embeddings, queries, skip_topics,
                               reranker_model, debug_logs)
  q2result = {q: var_candidates_to_dict(result) for q, result in results.items()}
  return json.dumps({
      'queryResults': q2result,
      'scoreThreshold': _get_threshold(nl_embeddings),
      'debugLogs': debug_logs
  })


@bp.route('/api/detect_verbs/', methods=['GET'])
def detect_verbs():
  """Returns a list tokens that detected as verbs.

  List[str]
  """
  query = str(escape(request.args.get('q')))
  nl_model = current_app.config[config.REGISTRY_KEY].attribute_model()
  return json.dumps(nl_model.detect_verbs(query.strip()))


@bp.route('/api/embeddings_version_map/', methods=['GET'])
def embeddings_version_map():
  return json.dumps(asdict(current_app.config[config.CATALOG_KEY]))


@bp.route('/api/load/', methods=['GET'])
def load():
  loader.load_custom_embeddings(current_app)
  return json.dumps(asdict(current_app.config[config.CATALOG_KEY]))


def _get_indexes(registry: Registry, idx: str) -> List[Embeddings]:
  nl_embeddings: List[Embeddings] = []

  if is_custom_dc() and idx != config.CUSTOM_DC_INDEX:
    # Order custom index first, so that when the score is the same
    # Custom DC will be preferred.
    emb = registry.get_index(config.CUSTOM_DC_INDEX)
    if emb:
      nl_embeddings.append(emb)

  emb = registry.get_index(idx)
  if emb:
    nl_embeddings.append(emb)

  return nl_embeddings


# NOTE: Custom DC embeddings addition needs to ensures that the
#       base vs. custom models do not use different thresholds
def _get_threshold(embeddings: List[Embeddings]) -> float:
  if embeddings:
    return embeddings[0].model.score_threshold
  return constants.SV_SCORE_DEFAULT_THRESHOLD
