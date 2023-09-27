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

from absl import app
from absl import logging
from google.cloud import aiplatform
from google.protobuf import json_format

_API_LOCATION = "us-central1-aiplatform.googleapis.com"
_ENDPOINT_NAME = "projects/datcom-204919/locations/us-central1/publishers/google/models/text-bison"
_PREDICT_PARAMETERS = {
    "temperature": 0.2,
    "maxOutputTokens": 20,
    "topP": 0.95,
    "topK": 40
}

client = aiplatform.gapic.PredictionServiceClient(
    client_options={"api_endpoint": _API_LOCATION})


def fetch_alt_query(query):
  prompt = f"Ask this question differently: {query}"
  logging.info("Calling prediction service with prompt: %s", prompt)
  try:
    proto_response = client.predict(endpoint=_ENDPOINT_NAME,
                                    instances=[{
                                        "prompt": prompt
                                    }],
                                    parameters=_PREDICT_PARAMETERS)

    response = json_format.MessageToDict(proto_response._pb)
    return response.get("predictions", [{}])[0].get("content",
                                                    "").split("\n")[0]
  except Exception as e:
    logging.warning("Error calling prediction service for the prompt: %s\n%s",
                    prompt, e)
    return ""


def main(_):
  print(fetch_alt_query("Which are the richest states in the US?"))


if __name__ == "__main__":
  app.run(main)
