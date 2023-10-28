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

from flask import Blueprint
from flask import current_app
from flask import request
from markupsafe import escape

from nl_server import config

bp = Blueprint('main', __name__, url_prefix='/')


@bp.route('/healthz')
def healthz():
  return ""


@bp.route('/api/search_sv/', methods=['GET'])
def search_sv():
  """Returns a dictionary with the following keys and values

  {
    'SV': List[str]
    'CosineScore': List[float],
    'SV_to_Sentences': Dict[str, str]
  }
  """
  query = str(escape(request.args.get('q')))
  sz = str(escape(request.args.get('sz', config.DEFAULT_INDEX_TYPE)))
  if not sz:
    sz = config.DEFAULT_INDEX_TYPE
  skip_multi_sv = False
  if request.args.get('skip_multi_sv'):
    skip_multi_sv = True
  try:
    nl_embeddings = current_app.config[config.NL_EMBEDDINGS_KEY].get(sz)
    return json.dumps(nl_embeddings.detect_svs(query, skip_multi_sv))
  except Exception as e:
    logging.error(f'Embeddings-based SV detection failed with error: {e}')
    return json.dumps({
        'SV': [],
        'CosineScore': [],
        'SV_to_Sentences': {},
        'MultiSV': {}
    })


@bp.route('/api/search_places/', methods=['GET'])
def search_places():
  """Returns a dictionary with the following keys and values

  {
    'places': List[str]
  }
  """
  query = str(escape(request.args.get('q')))
  nl_model = current_app.config[config.NL_MODEL_KEY]
  try:
    res = nl_model.detect_places_ner(query)
    return json.dumps({'places': res})
  except Exception as e:
    logging.error(f'NER place detection failed with error: {e}')
    return json.dumps({'places': []})


@bp.route('/api/search_verbs/', methods=['GET'])
def search_verbs():
  """Returns a list tokens that detected as verbs.

  List[str]
  """
  query = str(escape(request.args.get('q')))
  nl_model = current_app.config[config.NL_MODEL_KEY]
  return json.dumps(nl_model.detect_verbs(query.strip()))


@bp.route('/api/embeddings_version_map/', methods=['GET'])
def embeddings_version_map():
  return json.dumps(current_app.config[config.NL_EMBEDDINGS_VERSION_KEY])
