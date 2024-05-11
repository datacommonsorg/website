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
from typing import Dict

from flask import Flask
import yaml

from nl_server import config
import nl_server.embeddings_map as emb_map
from nl_server.nl_attribute_model import NLAttributeModel
from shared.lib.custom_dc_util import get_custom_dc_user_data_path
from shared.lib.gcs import download_gcs_file
from shared.lib.gcs import is_gcs_path
from shared.lib.gcs import join_gcs_path

_EMBEDDINGS_YAML = 'embeddings.yaml'
_CUSTOM_EMBEDDINGS_YAML_PATH = 'datacommons/nl/custom_embeddings.yaml'


#
# Reads the yaml files and loads all the server state.
#
def load_server_state(app: Flask):
  flask_env = os.environ.get('FLASK_ENV')

  embeddings_dict = _load_yaml(flask_env)
  nl_embeddings = emb_map.EmbeddingsMap(embeddings_dict)
  attribute_model = NLAttributeModel()
  _update_app_config(app, attribute_model, nl_embeddings, embeddings_dict)


def load_custom_embeddings(app: Flask):
  """Loads custom DC embeddings at runtime.

  This method should only be called at runtime (i.e. NOT at startup).
  It assumes that embeddings were already initialized at startup and this method
  only merges any newly loaded custom embeddings with the default embeddings.

  NOTE that this method requires that the custom embeddings be available
  on a local path.
  """
  flask_env = os.environ.get('FLASK_ENV')
  embeddings_map = _load_yaml(flask_env)

  # This lookup will raise an error if embeddings weren't already initialized previously.
  # This is intentional.
  nl_embeddings: emb_map.EmbeddingsMap = app.config[config.NL_EMBEDDINGS_KEY]
  try:
    embeddings_info = config.parse(embeddings_map)
    # Reset the custom DC index.
    nl_embeddings.reset_index(embeddings_info)
  except Exception as e:
    logging.error(f'Custom embeddings not loaded due to error: {str(e)}')

  # Update app config.
  _update_app_config(app, app.config[config.ATTRIBUTE_MODEL_KEY], nl_embeddings,
                     embeddings_map)


# Takes an embeddings map and returns a version that only has the default
# index and its model info
def _get_default_only_emb_map(embeddings_map: Dict[str, any]) -> Dict[str, any]:
  default_model_name = embeddings_map['indexes'][
      config.DEFAULT_INDEX_TYPE]['model']
  return {
      'version': embeddings_map['version'],
      'indexes': {
          config.DEFAULT_INDEX_TYPE:
              embeddings_map['indexes'][config.DEFAULT_INDEX_TYPE]
      },
      'models': {
          default_model_name: embeddings_map['models'][default_model_name]
      }
  }


def _load_yaml(flask_env: str) -> Dict[str, any]:
  with open(get_env_path(flask_env, _EMBEDDINGS_YAML)) as f:
    embeddings_map = yaml.full_load(f)

    # For custom DC dev env, only keep the default index.
    if _is_custom_dc_dev(flask_env):
      embeddings_map = _get_default_only_emb_map(embeddings_map)

  assert embeddings_map, 'No embeddings.yaml found!'

  custom_map = _maybe_load_custom_dc_yaml()
  if custom_map:
    embeddings_map['indexes'].update(custom_map.get('indexes', {}))
    embeddings_map['models'].update(custom_map.get('models', {}))

  return embeddings_map


def _update_app_config(app: Flask,
                       attribute_model: NLAttributeModel,
                       nl_embeddings: emb_map.EmbeddingsMap,
                       embeddings_version_map: Dict[str, any],
                       vertex_ai_models: Dict[str, Dict] = None):
  app.config[config.ATTRIBUTE_MODEL_KEY] = attribute_model
  app.config[config.NL_EMBEDDINGS_KEY] = nl_embeddings
  app.config[config.NL_EMBEDDINGS_VERSION_KEY] = embeddings_version_map
  app.config[config.VERTEX_AI_MODELS_KEY] = vertex_ai_models or {}


def _maybe_load_custom_dc_yaml():
  base = get_custom_dc_user_data_path()
  if not base:
    return None

  # TODO: Consider reading the base path from a "version.txt" instead
  # of hardcoding `data`
  if is_gcs_path(base):
    gcs_path = join_gcs_path(base, _CUSTOM_EMBEDDINGS_YAML_PATH)
    logging.info('Downloading custom embeddings yaml from GCS path: %s',
                 gcs_path)
    file_path = download_gcs_file(gcs_path)
    if not file_path:
      logging.info(
          "Custom embeddings yaml in GCS not found: %s. Custom embeddings will not be loaded.",
          gcs_path)
      return None
  else:
    file_path = os.path.join(base, _CUSTOM_EMBEDDINGS_YAML_PATH)

  logging.info("Custom embeddings YAML path: %s", file_path)

  if os.path.exists(file_path):
    with open(file_path) as f:
      return yaml.full_load(f)

  logging.info(
      "Custom embeddings YAML NOT found. Custom embeddings will NOT be loaded.")
  return None


#
# On prod the yaml files are in /datacommons/nl/, whereas
# in test-like environments it is the checked in path
# (deploy/nl/).
#
def get_env_path(flask_env: str, file_name: str) -> str:
  if flask_env in ['local', 'test', 'integration_test', 'webdriver'
                  ] or _is_custom_dc_dev(flask_env):
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        f'deploy/nl/{file_name}')

  return f'/datacommons/nl/{file_name}'


def _is_custom_dc_dev(flask_env: str) -> bool:
  return flask_env == 'custom_dev'
