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
"""Main entry module specified in app.yaml.

This module contains the request handler codes and the main app.
"""

import logging
import sys
import threading
import time

import requests

from server.__init__ import create_app

app = create_app()

WARM_UP_ENDPOINTS = [
    "/api/choropleth/geojson?placeDcid=country/USA&placeType=County",
    "/api/choropleth/geojson?placeDcid=Earth&placeType=Country",
    "/api/place/parent?dcid=country/USA",
    "/api/place/descendent/name?dcid=country/USA&descendentType=County",
]


def send_warmup_requests():
  for endpoint in WARM_UP_ENDPOINTS:
    # Rery 10 times before giving up, with 5 second intervals
    for _ in range(10):
      try:
        logging.info("Sending warm up requests: %s", endpoint)
        resp = requests.get("http://127.0.0.1:8080" + endpoint)
        if resp.status_code == 200:
          break
      except Exception as e:
        logging.error(e)
      time.sleep(5)


if not (app.config["TEST"] or app.config["WEBDRIVER"] or app.config["LOCAL"]):
  thread = threading.Thread(target=send_warmup_requests)
  thread.start()

if __name__ == '__main__':
  # This is used when running locally only. When deploying to GKE,
  # a webserver process such as Gunicorn will serve the app.
  logging.info("Run web server in local mode")
  port = sys.argv[1] if len(sys.argv) >= 2 else 8080
  app.run(host='0.0.0.0', port=port, debug=True)
