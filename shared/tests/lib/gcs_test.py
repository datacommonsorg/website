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
"""Tests for gcs functions"""

import os
from pathlib import Path
import unittest

from parameterized import parameterized
import pytest

import shared.lib.gcs as gcs


class TestGCSFunctions(unittest.TestCase):
  # All the test files are prepared in this bucket.
  bucket_name = 'datcom-ci-test'

  @pytest.fixture(autouse=True)
  def _inject_fixtures(self, tmp_path):
    self.tmp_path = tmp_path

  @parameterized.expand([
      ['abc', False],
      ['gs://bucket/object', True],
      ['gs://bucket', True],
      ['gs://', False],
  ])
  def test_is_gcs_path(self, path, result):
    self.assertEqual(gcs.is_gcs_path(path), result)

  @parameterized.expand([
      ['gs://bucket/object', ('bucket', 'object')],
      ['gs://bucket/folder/object', ('bucket', 'folder/object')],
      ['gs://bucket', ('bucket',)],
  ])
  def test_get_path_parts(self, path, result):
    self.assertEqual(gcs.get_path_parts(path), result)

  def test_get_path_parts_invalid_path(self):
    self.assertRaises(ValueError, gcs.get_path_parts, '@#@')

  @parameterized.expand([
      ['x/y.txt', 'folder1/folder11/d.txt', 'd'],
      ['a.txt', 'folder2/a.txt', 'a'],
  ])
  def test_download_file(self, local_file_path, blob_name, content):
    """
    Download a file from GCS to a local path. Here the blob_name is a file name.
    """
    f = self.tmp_path / local_file_path
    gcs.download_blob(self.bucket_name, blob_name, f)
    self.assertEqual(f.read_text(), content)

  def test_download_folder(self):
    """
    Test downloading a folder from GCS to a local path. And check all the nested
    files exist.
    """
    gcs_folder = 'folder1'
    gcs.download_blob(self.bucket_name, gcs_folder, self.tmp_path)
    p = Path(self.tmp_path)
    got_files = sorted([
        os.path.relpath(x, self.tmp_path) for x in p.rglob('*') if x.is_file()
    ])
    self.assertEqual(got_files, ['b.txt', 'c.txt', 'folder11/d.txt'])

  @parameterized.expand([
      [f'gs://{bucket_name}/folder1/folder11/d.txt', 'tmp.txt', 'd'],
  ])
  def test_download_blob_by_path(self, gcs_path, local_file_path, content):
    """Download a file based on GCS path.
    """
    f = self.tmp_path / local_file_path
    gcs.download_blob_by_path(gcs_path, f)
    self.assertEqual(f.read_text(), content)
