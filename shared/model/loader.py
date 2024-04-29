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

from google.cloud import aiplatform
from google.cloud import aiplatform_v1
import yaml


def _load_model_endpoints():
  model_yaml_file = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 'vertex_ai_endpoints.yaml')
  with open(model_yaml_file) as f:
    return yaml.full_load(f)


def load():
  logging.info("start model loading...")
  model_endpoints = _load_model_endpoints()
  models = {}
  for model_name, model_info in model_endpoints.items():
    aiplatform.init(project=model_info['project_id'],
                    location=model_info['location'])
    prediction_client = aiplatform.Endpoint(
        model_info['prediction_endpoint_id'])
    models[model_name] = {
        'prediction_client': prediction_client,
    }
    if model_info['type'] == 'EMBEDDING':
      # Embedding models should also include index ID ane endpoint.
      vector_search_client = aiplatform_v1.MatchServiceClient(
          client_options={"api_endpoint": model_info['index_endpoint_root']})
      models[model_name].update({
          'vector_search_client': vector_search_client,
          'index_endpoint': model_info['index_endpoint'],
          'index_id': model_info['index_id']
      })
  logging.info("finish model loading...")
  return models
