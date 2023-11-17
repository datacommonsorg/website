# Copyright 2020 Google LLC
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
from unittest.mock import patch

from flask import g

from web_app import app


class TestHlParamSelection(unittest.TestCase):

  def test_no_hl(self):
    with app.test_client() as c:
      c.get('/')
      assert (g.locale == 'en')
      assert (g.locale_choices == ['en'])

  def test_default_hl(self):
    with app.test_client() as c:
      c.get('/?hl=en')
      assert (g.locale == 'en')
      assert (g.locale_choices == ['en'])

  def test_simple_hl(self):
    with app.test_client() as c:
      c.get('/?hl=ru')
      assert (g.locale == 'ru')
      assert (g.locale_choices == ['ru', 'en'])

  def test_fallback_hl(self):
    with app.test_client() as c:
      c.get('/?hl=foobar')
      assert (g.locale == 'en')
      assert (g.locale_choices == ['en'])
