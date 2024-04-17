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
from enum import Enum
import os

from flask import Flask, request, jsonify
import numpy as np
from sentence_transformers import SentenceTransformer
from sentence_transformers.cross_encoder import CrossEncoder


class Model(str, Enum):
  FT_PROD = 'dc/all-MiniLM-L6-v2-ft'
  MINILM = 'sentence-transformers/all-MiniLM-L6-v2'
  SFR_MISTRAL = 'Salesforce/SFR-Embedding-Mistral'
  UAE_LARGE = 'WhereIsAI/UAE-Large-V1'
  # Unlike the above models, the below are reranking models.
  RERANKING_MINILM = 'cross-encoder/ms-marco-MiniLM-L-6-v2'
  RERANKING_MXBAIBASE = 'mixedbread-ai/mxbai-rerank-base-v1'


logging.getLogger('werkzeug').setLevel(logging.ERROR)

# A full list of model name can be found in model.list
model_name = os.environ['MODEL_NAME']


def create_model(model_name):
  print('create model:', model_name)
  if model_name == Model.FT_PROD:
    model = SentenceTransformer(
        '/app/ft_final_v20230717230459.all-MiniLM-L6-v2')
  elif model_name == Model.MINILM:
    model = SentenceTransformer(model_name)
  elif model_name == Model.SFR_MISTRAL:
    model = SentenceTransformer(model_name)
  elif model_name == Model.UAE_LARGE:
    # Since these GPU-specific imports are needed only for UAE_LARGE
    from angle_emb import AnglE, Prompts
    model = AnglE.from_pretrained(model_name, pooling_strategy='cls')
    model.set_prompt(prompt=Prompts.C)
  elif model_name in [Model.RERANKING_MINILM, Model.RERANKING_MXBAIBASE]:
    model = CrossEncoder(model_name)
  else:
    raise ValueError(f'Invalid model name: {model_name}')
  print('create model completed')
  return model


embedding_model = create_model(model_name)

app = Flask(__name__)


def normalize(embeddings):
  # vector from model should be normalized to 1 with l2 norm so the similarity
  # search dot product will be normalized to between 0 to 1
  return [(e / np.linalg.norm(e)).tolist() for e in embeddings]


@app.route('/healthz')
def healthz():
  return "OK", 200


@app.route('/predict', methods=['POST'])
def predict():
  instances = request.json['instances']
  if model_name in [
      Model.FT_PROD,
      Model.MINILM,
      Model.SFR_MISTRAL,
  ]:
    embeddings = embedding_model.encode(instances)
    return jsonify({'predictions': normalize(embeddings)}), 200
  if model_name == Model.UAE_LARGE:
    instances = [{'text': instance} for instance in instances]
    embeddings = embedding_model.encode(instances, to_numpy=True)
    return jsonify({'predictions': normalize(embeddings)}), 200
  if model_name in [Model.RERANKING_MINILM, Model.RERANKING_MXBAIBASE]:
    # Expects a list of string pairs: List[tuple[str, str]]
    scores = embedding_model.predict(instances)
    # Turn ndarray into a list of floats.
    return jsonify({'predictions': scores.tolist()}), 200
  logging.error('Invalid model name: %s', model_name)
  return {'predictions': []}, 200


if __name__ == '__main__':
  app.run(host='0.0.0.0', port=8080)
