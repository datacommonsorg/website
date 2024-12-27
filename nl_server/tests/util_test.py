# Copyright 2024 Google LLC
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

import os
import unittest
from unittest import mock

from parameterized import parameterized

from shared.lib.custom_dc_util import use_anonymous_gcs_client


class TestUtil(unittest.TestCase):

  @parameterized.expand([
      ('', '', False, "custom dc unset, empty path"),
      ('', '/local/path', False, "custom dc unset, local path"),
      ('', 'gs://foo/bar', False, "custom dc unset, gcs path"),
      ('false', '', False, "is not custom dc, empty path"),
      ('false', '/local/path', False, "is not custom dc, local path"),
      ('false', 'gs://foo/bar', False, "is not custom dc, gcs path"),
      ('true', '', True, "is custom dc, empty path"),
      ('true', '/local/path', True, "is custom dc, local path"),
      ('true', 'gs://foo/bar', False, "is custom dc, gcs path"),
  ])
  def test_use_anonymous_gcs_client(self, is_custom_dc, user_data_path, want,
                                    message):
    with mock.patch.dict(os.environ, {
        'IS_CUSTOM_DC': is_custom_dc,
        'USER_DATA_PATH': user_data_path
    }):
      self.assertEqual(use_anonymous_gcs_client(), want, message)
