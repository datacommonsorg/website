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

import multiprocessing
import os
import socket

from flask_testing import LiveServerTestCase

from nl_server.__init__ import create_app as create_nl_app
from server.__init__ import create_app as create_web_app
import server.lib.util as libutil


def find_open_port():
  for port in range(12000, 13000):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
      res = sock.connect_ex(('localhost', port))
      if res != 0:
        return port


# Start NL server on an unused port, so multiple integration tests can
# run at the same time.
if os.environ.get('DEFAULT_NL_SERVER'):
  port = 6060
else:
  port = find_open_port()


class NLWebServerTestCase(LiveServerTestCase):

  @classmethod
  def setUpClass(cls):
    if os.environ.get('ENABLE_MODEL') == 'true':

      if not os.environ.get('DEFAULT_NL_SERVER'):

        def start_nl_server(app):
          app.run(port=port, debug=False, use_reloader=False, threaded=True)

        nl_app = create_nl_app()
        # Create a thread that will contain our running server
        cls.proc = multiprocessing.Process(target=start_nl_server,
                                           args=(nl_app,),
                                           daemon=True)
        cls.proc.start()
      else:
        cls.proc = None
      libutil.check_backend_ready(['http://127.0.0.1:{}/healthz'.format(port)])

  @classmethod
  def tearDownClass(cls):
    if os.environ.get('ENABLE_MODEL') == 'true' and cls.proc:
      cls.proc.terminate()

  def create_app(self):
    """Returns the Flask Server running Data Commons."""
    if os.environ.get('ENABLE_MODEL') == 'true':
      app = create_web_app('http://127.0.0.1:{}'.format(port))
    else:
      app = create_web_app()
    app.config['LIVESERVER_PORT'] = 0
    return app
