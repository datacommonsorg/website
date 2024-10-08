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
"""Main entry for website Flask app.
"""

import logging
import sys

from server.__init__ import create_app

app = create_app()

if __name__ == '__main__':
  # This is used when running locally only. When deploying to GKE,
  # a webserver process such as Gunicorn will serve the app.
  logging.info("Run web server in local mode")
  port = sys.argv[1] if len(sys.argv) >= 2 else 8080
  app.run(host='0.0.0.0', port=port, debug=True)
