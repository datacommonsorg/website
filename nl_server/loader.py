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

import logging
import os

from nl_server import gcs
from nl_server.embeddings import Embeddings
from nl_server.ner_place_model import NERPlaces

nl_embeddings_cache_key_base = 'nl_embeddings'
nl_ner_cache_key = 'nl_ner'
nl_cache_path = '~/.datacommons/'
nl_cache_expire = 3600 * 24  # Cache for 1 day

DEFAULT_INDEX_TYPE = 'small'


def nl_embeddings_cache_key(index_type=DEFAULT_INDEX_TYPE):
  return f'{nl_embeddings_cache_key_base}_{index_type}'


def embeddings_config_key(index_type):
  return f'NL_EMBEDDINGS_{index_type.upper()}'


def _use_cache(flask_env):
  return flask_env == 'local' or flask_env == 'integration_test'


def load_model(app, model_map):
  flask_env = os.environ.get('FLASK_ENV')

  # Sanity check that file names aren't mispresented
  for sz in model_map.keys():
    assert sz in model_map[sz], f'{sz} not found in {model_map[sz]}'

  # In local dev, cache the model in disk so each hot reload won't download
  # the model again.
  if _use_cache(flask_env):
    from diskcache import Cache
    cache = Cache(nl_cache_path)
    cache.expire()

    nl_ner_places = cache.get(nl_ner_cache_key)
    app.config['NL_NER_PLACES'] = nl_ner_places

    missing_embeddings = False
    for sz in model_map.keys():
      nl_embeddings = cache.get(nl_embeddings_cache_key(sz))
      if not nl_embeddings:
        missing_embeddings = True
        break
      app.config[embeddings_config_key(sz)] = nl_embeddings

    if nl_ner_places and not missing_embeddings:
      logging.info("Using cached model for embeddings and NER in: " +
                   cache.directory)
      return

  # Download the model from GCS
  for sz in sorted(model_map.keys()):
    assert sz in model_map, f'{sz} missing from {model_map}'
    nl_embeddings = Embeddings(gcs.download_embeddings(model_map[sz]))
    app.config[embeddings_config_key(sz)] = nl_embeddings

  nl_ner_places = NERPlaces()
  app.config["NL_NER_PLACES"] = nl_ner_places

  if _use_cache(flask_env):
    with Cache(cache.directory) as reference:
      for sz in model_map.keys():
        reference.set(nl_embeddings_cache_key(sz),
                      app.config[embeddings_config_key(sz)],
                      expire=nl_cache_expire)
      reference.set(nl_ner_cache_key, nl_ner_places, expire=nl_cache_expire)
