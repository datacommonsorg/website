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
from multiprocessing import Process
import os

from flask_testing import LiveServerTestCase
import requests

import nl_app
import server.lib.util as libutil
import web_app

_dir = os.path.dirname(os.path.abspath(__file__))

_WEB_SERVER_URL = 'http://127.0.0.1:5000'
_NL_SERVER_URL = 'http://127.0.0.1:6060'


class IntegrationTest(LiveServerTestCase):

  @classmethod
  def setUpClass(cls):

    def start_nl_server(app):
      app.run(port=6060, debug=False, use_reloader=False)

    # Create a thread that will contain our running server
    cls.proc = Process(target=start_nl_server, args=(nl_app.app,), daemon=True)
    cls.proc.start()
    libutil.check_backend_ready([_NL_SERVER_URL + '/healthz'])

  @classmethod
  def tearDownClass(cls):
    cls.proc.terminate()

  def create_app(self):
    """Returns the Flask Server running Data Commons."""
    app_instance = web_app.app
    app_instance.config['LIVESERVER_PORT'] = 5000
    return app_instance

  def test_sample(self):
    resp = requests.post(_WEB_SERVER_URL +
                         '/nlnext/data?q=san%20jose%20population',
                         json={})
    with open(os.path.join(_dir, 'test_data', 'sample.json'), 'r') as infile:
      # infile.write(json.dumps(resp.json(), indent=2))
      expected = json.load(infile)
      a, b = (
          json.dumps(resp.json(), sort_keys=True),
          json.dumps(expected, sort_keys=True),
      )
      assert a == b