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
import threading
import yaml

from flask import Flask

import pubsub
import routes
import loader


def create_app():
  app = Flask(__name__)
  app.register_blueprint(routes.bp)

  flask_env = os.environ.get('FLASK_ENV')

  # Set the embedding gcs folder
  if flask_env == 'autopush' or flask_env == 'local':
    app.config['GCS_FOLDER'] = 'autopush/'
  elif flask_env == 'production':
    app.config['GCS_FOLDER'] = 'prod/'
  elif flask_env == 'staging':
    app.config['GCS_FOLDER'] = 'staging/'
  else:
    app.config['GCS_FOLDER'] = 'prod/'

  model_config_path = '/datacommons/model/model.yaml'
  if flask_env == 'local':
    model_config_path = os.path.abspath(
        os.path.join(os.path.curdir, '..', 'deploy/base/model.yaml'))
  app.config['MODEL_CONFIG_PATH'] = model_config_path

  # Initialize the NL module.
  with open(app.config['MODEL_CONFIG_PATH']) as f:
    model = yaml.full_load(f)
    if not model:
      logging.error("No configuration found for model")
      return
    loader.load_model(app, model['embeddings_file'])

  # Auto update the model
  if flask_env == 'local' or flask_env == 'autopush':
    thread = threading.Thread(target=pubsub.subscribe, args=(app,))
    thread.start()

  return app
