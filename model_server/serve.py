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

from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
from angle_emb import AnglE, Prompts

logging.getLogger('werkzeug').setLevel(logging.ERROR)

# A full list of model name can be found in model.list
model_name = os.environ['MODEL_NAME']
logging.info(model_name)


def create_model(model_name):
  logging.info('create model: %s', model_name)
  if model_name == 'dc/all-MiniLM-L6-v2-ft':
    model = SentenceTransformer(
        '/app/ft_final_v20230717230459.all-MiniLM-L6-v2')
  elif model_name == 'sentence-transformers/all-MiniLM-L6-v2':
    model = SentenceTransformer(model_name)
  elif model_name == 'Salesforce/SFR-Embedding-Mistral':
    model = SentenceTransformer(model_name)
  elif model_name == 'WhereIsAI/UAE-Large-V1':
    model = AnglE.from_pretrained('WhereIsAI/UAE-Large-V1',
                                  pooling_strategy='cls')
    model.set_prompt(prompt=Prompts.C)
  else:
    raise ValueError(f'Invalid model name: {model_name}')
  logging.info('create model completed')
  return model


embedding_model = create_model(model_name)

app = Flask(__name__)


@app.route('/healthz')
def healthz():
  return "OK", 200


@app.route('/predict', methods=['POST'])
def predict():
  instances = request.json['instances']
  if model_name in [
      'dc/all-MiniLM-L6-v2-ft',
      'sentence-transformers/all-MiniLM-L6-v2',
      'Salesforce/SFR-Embedding-Mistral',
  ]:
    embeddings = embedding_model.encode(instances)
    return jsonify({'predictions': embeddings.tolist()}), 200
  if model_name == 'WhereIsAI/UAE-Large-V1':
    instances = [{'text': instance} for instance in instances]
    embeddings = embedding_model.encode(instances, to_numpy=True)
    return jsonify({'predictions': embeddings.tolist()}), 200
  logging.error('Invalid model name: %s', model_name)
  return {'predictions': []}, 200


if __name__ == '__main__':
  app.run(host='0.0.0.0', port=8080)
