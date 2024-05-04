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
from typing import List

from google.cloud import aiplatform
from google.cloud import aiplatform_v1
import yaml


def _load_yaml(filename: str):
  yaml_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
  with open(yaml_file) as f:
    return yaml.full_load(f)


def load_models(model_type: str = None):
  logging.info("start model loading...")
  model_endpoints = _load_yaml('vertex_ai_models.yaml')
  models = {}
  for model_name, model_info in model_endpoints.items():
    # If caller specified the type of model to load, only load that type.
    # Otherwise, load everything.
    if model_type and model_info['type'] != model_type:
      continue
    aiplatform.init(project=model_info['project_id'],
                    location=model_info['location'])
    prediction_client = aiplatform.Endpoint(
        model_info['prediction_endpoint_id'])
    models[model_name] = {
        'prediction_client': prediction_client,
    }
  logging.info("finish model loading...")
  return models


def load_indexes():
  logging.info("start index loading...")
  models = load_models()
  index_endpoints = _load_yaml('vertex_ai_indexes.yaml')
  indexes = {}
  for index_name, index_info in index_endpoints.items():
    aiplatform.init(project=index_info['project_id'],
                    location=index_info['location'])
    vector_search_client = aiplatform_v1.MatchServiceClient(
        client_options={"api_endpoint": index_info['index_endpoint_root']})
    model = models.get(index_info['model'])
    if not model:
      logging.error(
          f'skipped loading index ${index_name} - refers to non-existent model.'
      )
      continue
    indexes[index_name] = {
        'vector_search_client': vector_search_client,
        'index_endpoint': index_info['index_endpoint'],
        'index_id': index_info['index_id'],
    }
    indexes[index_name].update(model)
  logging.info("finish index loading...")
  return indexes
