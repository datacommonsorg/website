# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import unittest
from unittest.mock import patch

from parameterized import parameterized

import server.lib.config as libconfig


class TestConfig(unittest.TestCase):

  @parameterized.expand([('test', {
      'TEST': True,
      'WEBDRIVER': False,
      'LOCAL': False,
      'LITE': False,
      'API_ROOT': 'api-root',
      'SECRET_PROJECT': '',
      'GA_ACCOUNT': '',
      'MAPS_API_KEY': '',
      'SCHEME': 'http',
  }),
                         ('local', {
                             'TEST': False,
                             'WEBDRIVER': False,
                             'LOCAL': True,
                             'LITE': False,
                             'API_ROOT': 'https://autopush.api.datacommons.org',
                             'SECRET_PROJECT': 'datcom-website-dev',
                             'GA_ACCOUNT': '',
                             'MAPS_API_KEY': '',
                             'SCHEME': 'http',
                         }),
                         ('production', {
                             'TEST': False,
                             'WEBDRIVER': False,
                             'LOCAL': False,
                             'LITE': False,
                             'API_ROOT': 'http://127.0.0.1:8081',
                             'SECRET_PROJECT': '',
                             'GA_ACCOUNT': 'UA-117119267-1',
                             'MAPS_API_KEY': '',
                             'SCHEME': 'https',
                         }),
                         ('webdriver', {
                             'TEST': False,
                             'WEBDRIVER': True,
                             'LOCAL': False,
                             'LITE': False,
                             'API_ROOT': 'https://autopush.api.datacommons.org',
                             'SECRET_PROJECT': 'datcom-website-dev',
                             'GA_ACCOUNT': '',
                             'MAPS_API_KEY': '',
                             'SCHEME': 'http',
                         })])
  def test_format_title(self, env, expected):
    with patch.dict(os.environ, {
        "FLASK_ENV": env,
    }):
      self.assertConfigEqual(libconfig.get_config(), expected)

  def assertConfigEqual(self, config, expected):
    self.assertEqual(config.TEST, expected['TEST'])
    self.assertEqual(config.WEBDRIVER, expected['WEBDRIVER'])
    self.assertEqual(config.LOCAL, expected['LOCAL'])
    self.assertEqual(config.LITE, expected['LITE'])
    self.assertEqual(config.API_ROOT, expected['API_ROOT'])
    self.assertEqual(config.GA_ACCOUNT, expected['GA_ACCOUNT'])
    self.assertEqual(config.MAPS_API_KEY, expected['MAPS_API_KEY'])
    self.assertEqual(config.SCHEME, expected['SCHEME'])
