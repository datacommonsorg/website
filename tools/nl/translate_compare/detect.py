import json
import logging

from absl import app
import requests

_API_BASE_URL = "https://dev.datacommons.org"

logging.getLogger().setLevel(logging.INFO)


def detect(query):
  try:
    resp = requests.post(f"{_API_BASE_URL}/api/explore/detect?q={query}",
                         json={
                             "contextHistory": {},
                             "dc": "",
                         },
                         timeout=30).json()
    return resp
  except Exception as e:
    logging.warning("Error calling detect for query: %s\n%s", query, e)
    return {}


def main(_):
  queries = [
      "Tell me about economic equity in California",
      "Why is it that some people in California have lots of money and some people don't have any money?"
  ]

  for query in queries:
    response = detect(query)
    print(json.dumps(response, indent=1))


if __name__ == "__main__":
  app.run(main)
