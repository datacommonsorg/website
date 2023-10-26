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
import sys

from flask import Flask
import torch
import yaml

from nl_server import config
import nl_server.loader as loader
import nl_server.routes as routes

_MODEL_YAML = 'models.yaml'
_EMBEDDINGS_YAML = 'embeddings.yaml'


def create_app():
  app = Flask(__name__)
  app.register_blueprint(routes.bp)

  # https://github.com/UKPLab/sentence-transformers/issues/1318
  if sys.version_info >= (3, 8) and sys.platform == "darwin":
    torch.set_num_threads(1)

  with open(get_env_path(_MODEL_YAML)) as f:
    models_map = yaml.full_load(f)
    assert models_map, 'No models.yaml found!'

  with open(get_env_path(_EMBEDDINGS_YAML)) as f:
    embeddings_map = yaml.full_load(f)
    assert embeddings_map, 'No embeddings.yaml found!'
    app.config[config.NL_EMBEDDINGS_VERSION_KEY] = embeddings_map

  loader.load_server_state(app, embeddings_map, models_map)

  return app


#
# On prod the yaml files are in /datacommons/nl/, whereas
# in test-like environments it is the checked in path
# (deploy/nl/).
#
def get_env_path(file_name: str) -> str:
  flask_env = os.environ.get('FLASK_ENV')
  if flask_env in ['local', 'test', 'integration_test', 'webdriver']:
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        f'deploy/nl/{file_name}')

  return f'/datacommons/nl/{file_name}'
