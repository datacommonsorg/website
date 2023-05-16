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

from flask import Flask
import yaml

import nl_server.loader as loader
import nl_server.routes as routes


def create_app():
  logging.info("========== CREATE NL APP!============")
  app = Flask(__name__)
  app.register_blueprint(routes.bp)

  flask_env = os.environ.get('FLASK_ENV')

  model_config_path = '/datacommons/nl/model.yaml'
  if flask_env == 'local' or flask_env == 'test' or flask_env == 'integration_test':
    model_config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'deploy/base/model.yaml')
  app.config['MODEL_CONFIG_PATH'] = model_config_path

  # Initialize the NL module.
  with open(app.config['MODEL_CONFIG_PATH']) as f:
    model = yaml.full_load(f)
    if not model:
      logging.error("No configuration found for model")
      return
    loader.load_model(app, model['embeddings_file'])

  return app
