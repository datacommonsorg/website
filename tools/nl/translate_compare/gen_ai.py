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
import multiprocessing

from absl import app
from google.cloud import aiplatform
from google.protobuf import json_format

_API_LOCATION = "us-central1-aiplatform.googleapis.com"
_ENDPOINT_NAME = "projects/datcom-204919/locations/us-central1/publishers/google/models/text-bison"
_PREDICT_PARAMETERS = {
    "temperature": 0.9,
    "maxOutputTokens": 30,
    "topP": 0.95,
    "topK": 40
}

logging.getLogger().setLevel(logging.INFO)

logging.info("Creating PredictionServiceClient.")
client = aiplatform.gapic.PredictionServiceClient(
    client_options={"api_endpoint": _API_LOCATION})
logging.info("PredictionServiceClient created.")


def fetch_alt_queries(queries, variation="more casually"):
  unordered_results = {}
  num_processes = max(1, min(len(queries), 8))
  tuples = [(query, variation) for query in queries]
  with multiprocessing.Pool(processes=num_processes) as pool:
    for query, alt_query in pool.imap_unordered(_fetch_alt_query, tuples):
      unordered_results[query] = alt_query

  ordered_results = dict([
      (query, unordered_results.get(query, "")) for query in queries
  ])
  return ordered_results


# imap (for multiprocessing) only works with a single argument, hence this method.
def _fetch_alt_query(tuple):
  query, variation = tuple
  return fetch_alt_query(query, variation)


def fetch_alt_query(query, variation="more casually"):
  prompt = f"Ask this question {variation}: {query}"
  logging.info("Calling prediction service with prompt: '%s'", prompt)
  try:
    proto_response = client.predict(endpoint=_ENDPOINT_NAME,
                                    instances=[{
                                        "prompt": prompt
                                    }],
                                    parameters=_PREDICT_PARAMETERS)

    response = json_format.MessageToDict(proto_response._pb)
    alt_query = response.get("predictions", [{}])[0].get("content",
                                                         "").split("\n")[0]
    logging.info("%s (%s) => %s", query, variation, alt_query)
    return (query, alt_query)
  except Exception as e:
    logging.warning("Error calling prediction service with prompt: '%s'\n%s",
                    prompt, e)
    return (query, "")


def main(_):
  queries = [
      "What is the correlation between obesity and poverty across counties in the US"
  ]
  variations = [
      "like a 6 year old",
      "like how a Chinese diplomat would ask on Google",
  ]

  results = {}
  for variation in variations:
    results[variation] = fetch_alt_queries(queries, variation)

  for variation, alt_queries in results.items():
    print(f"===={variation}====")
    for q, alt in alt_queries.items():
      print(q, " => ", alt)
    print()


if __name__ == "__main__":
  app.run(main)
