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

import sys

import logging
from flask import Flask
import torch

import nl_server.loader as loader
import nl_server.routes as routes
import google.cloud.logging


def create_app():

  client = google.cloud.logging.Client()
  client.setup_logging()

  logging.basicConfig(
      level=logging.INFO,
      format=
      "\u3010%(asctime)s\u3011\u3010%(levelname)s\u3011\u3010 %(filename)s:%(lineno)s \u3011 %(message)s ",
      datefmt="%H:%M:%S",
  )

  app = Flask(__name__)
  app.register_blueprint(routes.bp)

  # https://github.com/UKPLab/sentence-transformers/issues/1318
  if sys.version_info >= (3, 8) and sys.platform == "darwin":
    torch.set_num_threads(1)

  loader.load_server_state(app)

  return app
