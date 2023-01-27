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

from flask import Flask

import logging
import os
import routes

nl_embeddings_cache_key = 'nl_embeddings'
nl_embeddings_cache_path = '~/.datacommons/'
nl_embeddings_cache_expire = 3600 * 24  # Cache for 1 day


def create_app():
  app = Flask(__name__)
  app.register_blueprint(routes.bp)

  def load_model():
    # In local dev, cache the model in disk so each hot reload won't download
    # the model again.
    if os.environ.get('FLASK_ENV') == 'local':
      from diskcache import Cache
      cache = Cache(nl_embeddings_cache_path)
      cache.expire()
      nl_embeddings = cache.get(nl_embeddings_cache_key)
      app.config['NL_EMBEDDINGS'] = nl_embeddings
      if nl_embeddings:
        logging.info("Use cached model in: " + cache.directory)
        return

    # Some specific imports for the NL Interface.
    from lib.nl_embeddings import Embeddings
    nl_embeddings = Embeddings()
    app.config['NL_EMBEDDINGS'] = nl_embeddings
    if os.environ.get('FLASK_ENV') == 'local':
      with Cache(cache.directory) as reference:
        reference.set(nl_embeddings_cache_key,
                      nl_embeddings,
                      expire=nl_embeddings_cache_expire)

  # Initialize the NL module.
  load_model()

  return app
