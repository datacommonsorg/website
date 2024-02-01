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
from nl_server import loader
from shared.lib.constants import SV_SCORE_DEFAULT_THRESHOLD

bp = Blueprint('main', __name__, url_prefix='/')


@bp.route('/healthz')
def healthz():
  nl_embeddings = current_app.config[config.NL_EMBEDDINGS_KEY].get(
      config.DEFAULT_INDEX_TYPE)
  result = nl_embeddings.detect_svs('life expectancy',
                                    SV_SCORE_DEFAULT_THRESHOLD,
                                    skip_multi_sv=True)
  if result.get('SV'):
    return 'OK', 200
  return 'Service Unavailable', 500


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
  idx = str(escape(request.args.get('idx', config.DEFAULT_INDEX_TYPE)))
  if not idx:
    idx = config.DEFAULT_INDEX_TYPE

  threshold = escape(request.args.get('threshold'))
  if threshold:
    try:
      threshold = float(threshold)
    except Exception:
      logging.error(f'Found non-float threshold value: {threshold}')
      threshold = SV_SCORE_DEFAULT_THRESHOLD
  else:
    threshold = SV_SCORE_DEFAULT_THRESHOLD

  skip_multi_sv = False
  if request.args.get('skip_multi_sv'):
    skip_multi_sv = True

  nl_embeddings = current_app.config[config.NL_EMBEDDINGS_KEY].get(idx)
  return json.dumps(nl_embeddings.detect_svs(query, threshold, skip_multi_sv))


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


@bp.route('/api/detect_verbs/', methods=['GET'])
def detect_verbs():
  """Returns a list tokens that detected as verbs.

  List[str]
  """
  query = str(escape(request.args.get('q')))
  nl_model = current_app.config[config.NL_MODEL_KEY]
  return json.dumps(nl_model.detect_verbs(query.strip()))


@bp.route('/api/embeddings_version_map/', methods=['GET'])
def embeddings_version_map():
  return json.dumps(current_app.config[config.NL_EMBEDDINGS_VERSION_KEY])


@bp.route('/api/load/', methods=['GET'])
def load():
  loader.load_custom_embeddings(current_app)
  return json.dumps(current_app.config[config.NL_EMBEDDINGS_VERSION_KEY])
