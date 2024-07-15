# Copyright 2024 Google LLC
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
import sys

from flask import Flask
import google.cloud.logging
import torch

from nl_server import registry
from nl_server import routes
from nl_server import search
from shared.lib import constants
from shared.lib import gcp as lib_gcp
from shared.lib import utils as lib_utils


def create_app():

  if lib_gcp.in_google_network() and not lib_utils.is_test_env():
    client = google.cloud.logging.Client()
    client.setup_logging()
  else:
    logging.basicConfig(
        level=logging.INFO,
        format=
        "[%(asctime)s][%(levelname)-8s][%(filename)s:%(lineno)s] %(message)s ",
        datefmt="%H:%M:%S",
    )

  log_level = logging.WARNING
  if lib_utils.is_debug_mode():
    log_level = logging.INFO
  logging.getLogger('werkzeug').setLevel(log_level)

  # https://github.com/UKPLab/sentence-transformers/issues/1318
  if sys.version_info >= (3, 8) and sys.platform == "darwin":
    torch.set_num_threads(1)

  try:
    # Build the registry before creating the Flask app to make sure all resources
    # are loaded.
    additional_catalog_path = os.environ.get('ADDITIONAL_CATALOG_PATH')
    reg = registry.build(additional_catalog_path=additional_catalog_path)

    if not lib_utils.is_test_env():
      # Below is a safe check to ensure that the model and embedding is loaded.
      server_config = reg.server_config()
      idx_type = server_config.default_indexes[0]
      embeddings = reg.get_index(idx_type)
      query = server_config.indexes[idx_type].healthcheck_query
      result = search.search_vars([embeddings], [query]).get(query)
      if not result or not result.svs:
        raise Exception(f'Registry does not have default index {idx_type}')

    app = Flask(__name__)
    app.register_blueprint(routes.bp)
    app.config[registry.REGISTRY_KEY] = reg

    logging.info('NL Server Flask app initialized')
    return app
  except Exception as e:
    msg = '\n!!!!! IMPORTANT NOTE !!!!!!\n' \
          'If you are running locally, try clearing models:\n' \
          '* `rm -rf /tmp/datcom-nl-models /tmp/datcom-nl-models-dev`\n'
    print('\033[91m{}\033[0m'.format(msg))
    raise e
