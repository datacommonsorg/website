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


import os

from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer


model_name = os.environ['MODEL_NAME']

model = SentenceTransformer(model_name)

app = Flask(__name__)

@app.route('/healthz')
def healthz():
    return "OK", 200  # Simple health check response

@app.route('/predict', methods=['POST'])
def predict():
    # Example with image input:
    instances = request.json['instances']
    embeddings = model.encode(instances)
    result = {'predictions': {}}
    for instance, embedding in zip(instances, embeddings):
        result['predictions'][instance] = embedding.tolist()
    return jsonify(result), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)