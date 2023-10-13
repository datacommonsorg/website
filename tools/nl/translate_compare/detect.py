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

import json
import logging

from absl import app
import requests

_API_BASE_URL = "https://dev.datacommons.org"

logging.getLogger().setLevel(logging.INFO)


class Detection:

  def __init__(self, response: dict) -> None:
    context: dict = response.get("context", [{}])[0]
    self.svs = set(context.get("svs", []))
    self.places = set()
    for place in context.get("places", []):
      dcid = place.get("dcid", "")
      if dcid:
        self.places.add(dcid)

  def compare(self, other: "Detection"):
    return {
        "places": len(self.places.intersection(other.places)),
        "svs": len(self.svs.intersection(other.svs))
    }

  def num_attributes(self):
    return {"places": len(self.places), "svs": len(self.svs)}

  def __str__(self) -> str:
    return f"Places ({len(self.places)}): {self.places}\nSVs ({len(self.svs)}): {self.svs}"


def detect(query):
  try:
    resp = requests.post(
        f"{_API_BASE_URL}/api/explore/detect?detector=heuristic&q={query}",
        json={
            "contextHistory": {},
            "dc": "",
        },
        timeout=30).json()
    return Detection(resp)
  except Exception as e:
    logging.warning("Error calling detect for query: %s\n%s", query, e)
    return Detection({})


# TODO: cleanup
def main(_):
  queries = [
      "Tell me about economic equity in California",
      "Why is it that some people in California have lots of money and some people don't have any money?"
  ]

  result1 = detect(queries[0])
  result2 = detect(queries[1])
  print(result1)
  print(result2)
  print(result1.compare(result2))


if __name__ == "__main__":
  app.run(main)
