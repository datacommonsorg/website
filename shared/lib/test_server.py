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
import platform
import socket
import warnings

from flask_testing import LiveServerTestCase

from nl_server.flask import create_app as create_nl_app
from server.__init__ import create_app as create_web_app
import server.lib.util as libutil


def find_open_port():
  for port in range(12000, 13000):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
      res = sock.connect_ex(('localhost', port))
      if res != 0:
        return port


is_nl_mode = os.environ.get('ENABLE_MODEL') == 'true'
if is_nl_mode:
  # Start NL server on an unused port, so multiple integration tests can
  # run at the same time.
  if platform.system() == 'Darwin' and platform.processor() == 'arm':
    msg = '\n\n!!!!! IMPORTANT NOTE !!!!!!\n' \
          'Detected MacOS ARM processor! You need to have a local ' \
          'NL server running (using run_nl_server.sh).\n'
    warnings.warn(msg)
    nl_port = 6060
    should_start_nl_server = False
  else:
    nl_port = find_open_port()
    should_start_nl_server = True


def start_nl_server(app):
  app.run(port=nl_port, debug=False, use_reloader=False, threaded=True)


class NLWebServerTestCase(LiveServerTestCase):

  @classmethod
  def setUpClass(cls):
    if is_nl_mode:
      if should_start_nl_server:

        nl_app = create_nl_app()
        # Create a thread that will contain our running server
        cls.proc = multiprocessing.Process(target=start_nl_server,
                                           args=(nl_app,),
                                           daemon=True)
        cls.proc.start()
      else:
        cls.proc = None
      libutil.check_backend_ready(
          ['http://127.0.0.1:{}/healthz'.format(nl_port)])

  @classmethod
  def tearDownClass(cls):
    if is_nl_mode and cls.proc:
      cls.proc.terminate()

  def create_app(self):
    """Returns the Flask Server running Data Commons."""
    if is_nl_mode:
      app = create_web_app('http://127.0.0.1:{}'.format(nl_port))
    else:
      app = create_web_app()
    app.config['LIVESERVER_PORT'] = 0
    return app
