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

import unittest

import server.lib.util as libutil

# Match the port used by run_nl_and_web_servers.sh.
# This differs from the port used by run_server.sh so tests can be run
# without shutting down any active dev server.
WEB_PORT = 8090


class NLWebServerTestCase(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    # If this check fail, you need to start up website and NL servers
    # with ./run_nl_and_web_servers.sh before running pytest.
    libutil.check_backend_ready([f'{cls.get_class_server_url()}/health'])

  @classmethod
  def get_class_server_url(cls):
    # A separate health check isn't needed for the NL server
    # since the website server does one already.
    return 'http://localhost:%s' % WEB_PORT

  def get_server_url(self):
    return self.__class__.get_class_server_url()
