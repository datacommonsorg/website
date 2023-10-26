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

import os
from typing import Any, Dict

from nl_server import config
from nl_server import embeddings_store
from nl_server.nl_attribute_model import NLAttributeModel

NL_CACHE_PATH = '~/.datacommons/'
NL_EMBEDDINGS_CACHE_KEY = 'nl_embeddings'
NL_MODEL_CACHE_KEY = 'nl_model'
_NL_CACHE_EXPIRE = 3600 * 24  # Cache for 1 day
_NL_CACHE_SIZE_LIMIT = 16e9  # 16Gb local cache size


def _use_cache(flask_env):
  return flask_env in ['local', 'integration_test', 'webdriver']


def load_server_state(app: Any, embeddings_map: Dict[str, str],
                      models_map: Dict[str, str]):
  flask_env = os.environ.get('FLASK_ENV')

  # In local dev, cache the embeddings on disk so each hot reload won't download
  # the embeddings again.
  if _use_cache(flask_env):
    from diskcache import Cache
    cache = Cache(NL_CACHE_PATH, size_limit=_NL_CACHE_SIZE_LIMIT)
    cache.expire()

    nl_model = cache.get(NL_MODEL_CACHE_KEY)
    nl_embeddings = cache.get(NL_EMBEDDINGS_CACHE_KEY)
    if nl_model and nl_embeddings:
      app.config['NL_MODEL'] = nl_model
      app.config['NL_EMBEDDINGS'] = nl_embeddings
      return

  nl_embeddings = embeddings_store.Store(config.load(embeddings_map,
                                                     models_map))
  app.config['NL_EMBEDDINGS'] = nl_embeddings

  nl_model = NLAttributeModel()
  app.config["NL_MODEL"] = nl_model

  if _use_cache(flask_env):
    with Cache(cache.directory, size_limit=_NL_CACHE_SIZE_LIMIT) as reference:
      reference.set(NL_EMBEDDINGS_CACHE_KEY,
                    nl_embeddings,
                    expire=_NL_CACHE_EXPIRE)
      reference.set(NL_MODEL_CACHE_KEY, nl_model, expire=_NL_CACHE_EXPIRE)
