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
import sys

from flask import Flask
import google.cloud.logging
import torch

import nl_server.loader as loader
import nl_server.routes as routes
import shared.lib.gcp as lib_gcp
from shared.lib.utils import is_debug_mode


def create_app():

  if lib_gcp.in_google_network():
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
  if is_debug_mode():
    log_level = logging.INFO
  logging.getLogger('werkzeug').setLevel(log_level)

  app = Flask(__name__)
  app.register_blueprint(routes.bp)

  # https://github.com/UKPLab/sentence-transformers/issues/1318
  if sys.version_info >= (3, 8) and sys.platform == "darwin":
    torch.set_num_threads(1)

  try:
    loader.load_server_state(app)
  except Exception as e:
    msg = '\n!!!!! IMPORTANT NOTE !!!!!!\n' \
          'If you are running locally, try clearing caches and models:\n' \
          '* `rm -rf ~/.datacommons`\n' \
          '* `rm -rf /tmp/datcom-nl-models /tmp/datcom-nl-models-dev`\n'
    print('\033[91m{}\033[0m'.format(msg))
    raise

  return app
