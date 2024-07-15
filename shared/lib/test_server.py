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
import unittest
import warnings

from nl_server.flask import create_app as create_nl_app
from server.__init__ import create_app as create_web_app
import server.lib.util as libutil


def find_open_port(skip_ports: set[int] | None = None):
  for port in range(12000, 13000):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
      if skip_ports and port in skip_ports:
        continue
      res = sock.connect_ex(('localhost', port))
      if res != 0:
        return port

def get_nl_port(web_port: int):
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
      nl_port = find_open_port(set[web_port])
      should_start_nl_server = True
  return nl_port, should_start_nl_server


def start_nl_server(port):
  nl_app = create_nl_app()
  nl_app.run(port=port, debug=False, use_reloader=False, threaded=True)


def start_web_server(web_port, nl_port=None):
  if nl_port:
    web_app = create_web_app(f'http://127.0.0.1:{nl_port}')
  else:
    web_app = create_web_app()
  web_app.run(port=web_port, use_reloader=False)


class NLWebServerTestCase(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    cls.web_port = find_open_port()
    cls.is_nl_mode = os.environ.get('ENABLE_MODEL') == 'true'
    nl_port = None
    if cls.is_nl_mode:
      nl_port, should_start_nl_server = get_nl_port(cls.web_port)
      if should_start_nl_server:

        # Create a thread that will contain our running server
        cls.nl_proc = multiprocessing.Process(target=start_nl_server,
                                              args=(nl_port,),
                                              daemon=True)
        cls.nl_proc.start()
      else:
        cls.nl_proc = None
      libutil.check_backend_ready(
          ['http://127.0.0.1:{}/healthz'.format(nl_port)])

    skip_ports = set([cls.web_port, nl_port])
    # Start web app.
    for _ in range(5):
      try:
        print("trying to start server")
        cls.web_proc = multiprocessing.Process(target=start_web_server,
                                              args=(cls.web_port, nl_port))
        cls.web_proc.start()
        print("server started")
        break
      except Exception as e:
        print("exception caught in test server")
        print(str(e))
        if "already in use" in str(e):
          cls.web_port = find_open_port(skip_ports)
          skip_ports.add(cls.web_port)
          print(skip_ports)
          continue
        else:
          print("raising exception")
          raise e
    libutil.check_backend_ready([f'http://127.0.0.1:{cls.web_port}/healthz'])

  def get_server_url(cls):
    return f'http://localhost:{cls.web_port}'

  @classmethod
  def tearDownClass(cls):
    if cls.is_nl_mode and cls.nl_proc:
      cls.nl_proc.terminate()
    cls.web_proc.terminate()