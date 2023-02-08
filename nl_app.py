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
"""Main entry module for NL app."""

import logging

from nl_server.__init__ import create_app

logging.basicConfig(
    level=logging.INFO,
    format=
    "\u3010%(asctime)s\u3011\u3010%(levelname)s\u3011\u3010 %(filename)s:%(lineno)s \u3011 %(message)s ",
    datefmt="%H:%M:%S",
)

app = create_app()

if __name__ == '__main__':
  # This is used when running locally only. When deploying to GKE,
  # a webserver process such as Gunicorn will serve the app.
  logging.info("Run nl server in local mode")
  app.run(host='127.0.0.1', port=6060, debug=True)
