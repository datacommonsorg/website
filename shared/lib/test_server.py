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


class NLWebServerTestCase(LiveServerTestCase):

  @classmethod
  def setUpClass(cls):
    if os.environ.get('ENABLE_MODEL') == 'true':
      # Start NL server on an unused port, so multiple integration tests can
      # run at the same time.
      sock = socket.socket()
      sock.bind(('', 0))
      cls.port = sock.getsockname()[1]

      def start_nl_server(app):
        app.run(port=cls.port,
                debug=False,
                use_reloader=False,
                threaded=False,
                processes=4)

      nl_app = create_nl_app()
      # Create a thread that will contain our running server
      cls.proc = multiprocessing.Process(target=start_nl_server,
                                         args=(nl_app,),
                                         daemon=True)
      cls.proc.start()
      libutil.check_backend_ready(
          ['http://127.0.0.1:{}/healthz'.format(cls.port)])

  @classmethod
  def tearDownClass(cls):
    if os.environ.get('ENABLE_MODEL') == 'true':
      cls.proc.terminate()

  def create_app(cls):
    """Returns the Flask Server running Data Commons."""
    app = create_web_app('http://127.0.0.1:{}'.format(cls.port))
    app.config['LIVESERVER_PORT'] = 0
    return app
