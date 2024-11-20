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

NL_PORT = 6060
WEB_PORT = 8080


class NLWebServerTestCase(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    # If this check fail, you need to start up website and NL servers
    # with ./run_servers.sh before running pytest.
    libutil.check_backend_ready([f'{cls.get_class_server_url()}/healthz'])

  @classmethod
  def get_class_server_url(cls):
    return 'http://localhost:8080'

  def get_server_url(self):
    return self.__class__.get_class_server_url()
