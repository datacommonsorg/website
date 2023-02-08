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
from multiprocessing import Process
import os

from flask_testing import LiveServerTestCase
import requests

from nl_server.__init__ import create_app as create_nl_app
from server.__init__ import create_app as create_web_app
import server.lib.util as libutil

_dir = os.path.dirname(os.path.abspath(__file__))

_NL_SERVER_URL = 'http://127.0.0.1:6060'

_TEST_MODE = os.environ['TEST_MODE']


class IntegrationTest(LiveServerTestCase):

  @classmethod
  def setUpClass(cls):

    def start_nl_server(app):
      app.run(port=6060, debug=False, use_reloader=False, threaded=True)

    nl_app = create_nl_app()
    # Create a thread that will contain our running server
    cls.proc = Process(target=start_nl_server, args=(nl_app,), daemon=True)
    cls.proc.start()
    libutil.check_backend_ready([_NL_SERVER_URL + '/healthz'])

  @classmethod
  def tearDownClass(cls):
    cls.proc.terminate()

  def create_app(self):
    """Returns the Flask Server running Data Commons."""
    return create_web_app()

  def test_sample(self):
    resp = requests.post(self.get_server_url() +
                         '/nlnext/data?q=san%20jose%20population',
                         json={}).json()

    resp['debug'] = {}
    resp['context'] = {}
    if _TEST_MODE == 'write':
      with open(os.path.join(_dir, 'test_data', 'sample.json'), 'w') as infile:
        infile.write(json.dumps(resp, indent=2))
    else:
      with open(os.path.join(_dir, 'test_data', 'sample.json'), 'r') as infile:
        expected = json.load(infile)
        expected['debug'] = {}
        expected['context'] = {}
        a, b = (
            json.dumps(resp, sort_keys=True),
            json.dumps(expected, sort_keys=True),
        )
        assert a == b