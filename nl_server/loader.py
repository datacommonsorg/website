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

nl_embeddings_cache_key = 'nl_embeddings'
nl_ner_cache_key = 'nl_ner'
nl_cache_path = '~/.datacommons/'
nl_cache_expire = 3600 * 24  # Cache for 1 day


def load_model(app, embeddings_file):
  flask_env = os.environ.get('FLASK_ENV')
  # In local dev, cache the model in disk so each hot reload won't download
  # the model again.
  if flask_env == 'local' or flask_env == 'integration_test':
    from diskcache import Cache
    cache = Cache(nl_cache_path)
    cache.expire()
    nl_embeddings = cache.get(nl_embeddings_cache_key)
    app.config['NL_EMBEDDINGS'] = nl_embeddings
    nl_ner_places = cache.get(nl_ner_cache_key)
    app.config['NL_NER_PLACES'] = nl_ner_places
    if nl_embeddings and nl_ner_places:
      logging.info("Use cached model for embeddings and NER in: " +
                   cache.directory)
      return

  # Download the model from GCS
  nl_embeddings = Embeddings(gcs.download_embeddings(embeddings_file))
  app.config['NL_EMBEDDINGS'] = nl_embeddings
  nl_ner_places = NERPlaces()
  app.config["NL_NER_PLACES"] = nl_ner_places

  if flask_env == 'local' or flask_env == 'integration_test':
    with Cache(cache.directory) as reference:
      reference.set(nl_embeddings_cache_key,
                    nl_embeddings,
                    expire=nl_cache_expire)
      reference.set(nl_ner_cache_key, nl_ner_places, expire=nl_cache_expire)
