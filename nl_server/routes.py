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

import json
from typing import Dict, List

from flask import Blueprint
from flask import current_app
from flask import request
from markupsafe import escape

from nl_server import config
from nl_server import loader
from nl_server import search
from nl_server.embeddings import Embeddings
from nl_server.embeddings_map import EmbeddingsMap
from shared.lib.custom_dc_util import is_custom_dc
from shared.lib.detected_variables import var_candidates_to_dict
from shared.lib.detected_variables import VarCandidates

bp = Blueprint('main', __name__, url_prefix='/')


@bp.route('/healthz')
def healthz():
  nl_embeddings = current_app.config[config.NL_EMBEDDINGS_KEY].get_index(
      config.DEFAULT_INDEX_TYPE)
  result: VarCandidates = search.search_vars(
      [nl_embeddings], ['life expectancy'])['life expectancy']
  if result.svs and 'Expectancy' in result.svs[0]:
    return 'OK', 200
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

  idx = str(escape(request.args.get('idx', config.DEFAULT_INDEX_TYPE)))
  if not idx:
    idx = config.DEFAULT_INDEX_TYPE

  emb_map: EmbeddingsMap = current_app.config[config.NL_EMBEDDINGS_KEY]

  skip_topics = False
  if request.args.get('skip_topics'):
    skip_topics = True

  reranker_name = str(escape(request.args.get('reranker', '')))
  reranker_model = emb_map.get_reranking_model(
      reranker_name) if reranker_name else None

  nl_embeddings = _get_indexes(emb_map, idx)
  results: Dict[str,
                VarCandidates] = search.search_vars(nl_embeddings, queries,
                                                    skip_topics, reranker_model)
  json_result = {
      q: var_candidates_to_dict(result) for q, result in results.items()
  }
  return json.dumps(json_result)


@bp.route('/api/detect_verbs/', methods=['GET'])
def detect_verbs():
  """Returns a list tokens that detected as verbs.

  List[str]
  """
  query = str(escape(request.args.get('q')))
  nl_model = current_app.config[config.ATTRIBUTE_MODEL_KEY]
  return json.dumps(nl_model.detect_verbs(query.strip()))


@bp.route('/api/embeddings_version_map/', methods=['GET'])
def embeddings_version_map():
  return json.dumps(current_app.config[config.NL_EMBEDDINGS_VERSION_KEY])


@bp.route('/api/load/', methods=['GET'])
def load():
  loader.load_custom_embeddings(current_app)
  return json.dumps(current_app.config[config.NL_EMBEDDINGS_VERSION_KEY])


def _get_indexes(emb_map: EmbeddingsMap, idx: str) -> List[Embeddings]:
  nl_embeddings: List[Embeddings] = []

  if is_custom_dc() and idx != config.CUSTOM_DC_INDEX:
    # Order custom index first, so that when the score is the same
    # Custom DC will be preferred.
    emb = emb_map.get_index(config.CUSTOM_DC_INDEX)
    if emb:
      nl_embeddings.append(emb)

  emb = emb_map.get_index(idx)
  if emb:
    nl_embeddings.append(emb)

  return nl_embeddings
