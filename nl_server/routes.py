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
import logging
from typing import List, Tuple

from flask import Blueprint
from flask import current_app
from flask import escape
from flask import request

bp = Blueprint('main', __name__, url_prefix='/')


@bp.route('/healthz')
def healthz():
  return ""


def _query_embedding(query: str) -> Tuple[List[float], str]:
  try:
    nl_embeddings = current_app.config['NL_EMBEDDINGS']
    return nl_embeddings.get_embedding(query), ''
  except Exception as e:
    return [], f'Could not generate an embeddings vector. Failed with error: {e}'


def _index_embedding(index: int) -> Tuple[List[float], str]:
  try:
    nl_embeddings = current_app.config['NL_EMBEDDINGS']
    return nl_embeddings.get_embedding_at_index(index), ''
  except Exception as e:
    return [], f'Could not retrieve an embeddings vector. Failed with error: {e}'


@bp.route('/api/embedding/', methods=['GET'])
def embedding():
  """Returns a dictionary with the following structure:
  {
    'embeddings_vector': List[float]
  }

  The query can have the following params:
    'q': this is expected to be any string, e.g. a sentence. The embedding
      returned is the query string's embedding vector.
    'i': this is an index. If the index lies within the range of the
      embeddings currently loaded, then the return value is the embedding
      vector at that index. Otherwise, an empty array is returned.
  """
  query = str(escape(request.args.get('q', '')))
  index: int = int(escape(request.args.get('i', -1)))

  vector, err = [], ''
  # If query string is present, then it is given preference.
  if query:
    vector, err = _query_embedding(query)
  elif index:
    vector, err = _index_embedding(index)

  if err:
    logging.error(err)

  return json.dumps({'embeddings_vector': vector})


@bp.route('/api/search_sv/', methods=['GET'])
def search_sv():
  """Returns a dictionary with the following keys and values

  {
    'SV': List[str]
    'CosineScore': List[float],
    'EmbeddingIndex': List[int],
    'SV_to_Sentences': Dict[str, str]
  }
  """
  query = str(escape(request.args.get('q')))
  try:
    nl_embeddings = current_app.config['NL_EMBEDDINGS']
    return json.dumps(nl_embeddings.detect_svs(query))
  except Exception as e:
    logging.error(f'Embeddings-based SV detection failed with error: {e}')
    return json.dumps({
        'SV': [],
        'CosineScore': [],
        'EmbeddingIndex': [],
        'SV_to_Sentences': {}
    })


@bp.route('/api/search_places/', methods=['GET'])
def search_places():
  """Returns a dictionary with the following keys and values

  {
    'places': List[str]
  }
  """
  query = str(escape(request.args.get('q')))
  nl_ner_places = current_app.config['NL_NER_PLACES']
  try:
    res = nl_ner_places.detect_places_ner(query)
    return json.dumps({'places': res})
  except Exception as e:
    logging.error(f'NER place detection failed with error: {e}')
    return json.dumps({'places': []})
