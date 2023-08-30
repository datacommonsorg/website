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
import sys

from flask import Flask
import torch
import yaml

import nl_server.loader as loader
import nl_server.routes as routes


def create_app():
  app = Flask(__name__)
  app.register_blueprint(routes.bp)

  flask_env = os.environ.get('FLASK_ENV')

  # https://github.com/UKPLab/sentence-transformers/issues/1318
  if sys.version_info >= (3, 8) and sys.platform == "darwin":
    torch.set_num_threads(1)

  # Download existing finetuned models (if not already downloaded).
  models_downloaded_paths = {}
  models_config_path = '/datacommons/nl/models.yaml'
  if flask_env in ['local', 'test', 'integration_test', 'webdriver']:
    models_config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'deploy/nl/models.yaml')
  app.config['MODELS_CONFIG_PATH'] = models_config_path
  with open(app.config['MODELS_CONFIG_PATH']) as f:
    models_map = yaml.full_load(f)
    if not models_map:
      logging.error("No configuration found for model")
      return

    models_downloaded_paths = loader.download_models(models_map)

  assert models_downloaded_paths, "No models were found/downloaded. Check deploy/nl/models.yaml"

  # Download existing embeddings (if not already downloaded).
  embeddings_config_path = '/datacommons/nl/embeddings.yaml'
  if flask_env in ['local', 'test', 'integration_test', 'webdriver']:
    embeddings_config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'deploy/nl/embeddings.yaml')
  app.config['EMBEDDINGS_CONFIG_PATH'] = embeddings_config_path

  # Initialize the NL module.
  with open(app.config['EMBEDDINGS_CONFIG_PATH']) as f:
    embeddings_map = yaml.full_load(f)
    if not embeddings_map:
      logging.error("No configuration found for embeddings")
      return

    app.config['EMBEDDINGS_VERSION_MAP'] = embeddings_map
    loader.load_embeddings(app, embeddings_map, models_downloaded_paths)

  return app
