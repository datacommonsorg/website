# Copyright 2024 Google LLC
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
import shutil
import tempfile
import unittest

from tools.nl.embeddings import utils
from tools.nl.embeddings.utils import Embedding
from tools.nl.embeddings.utils import PreIndex

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))


class TestBuildPreindex(unittest.TestCase):

  def setUp(self):
    # Create two temporary directories
    self.temp_dir1 = tempfile.mkdtemp()
    self.temp_dir2 = tempfile.mkdtemp()

  def tearDown(self):
    # Clean up the temporary directories
    shutil.rmtree(self.temp_dir1)
    shutil.rmtree(self.temp_dir2)

  def _compare_files(self, output_path, expected_path):
    with open(output_path) as gotf, open(expected_path) as wantf:
      got = gotf.read()
      want = wantf.read()
      self.assertEqual(got, want)

  def test_file_content(self):
    test_input_dir = os.path.join(self.temp_dir1, 'input')
    shutil.copytree(os.path.join(_THIS_DIR, 'testdata/input'), test_input_dir)
    fm = utils.FileManager(test_input_dir, self.temp_dir2)
    utils.build_and_save_preindexes(fm)
    self._compare_files(
        os.path.join(test_input_dir, '_preindex.csv'),
        os.path.join(_THIS_DIR, 'testdata/expected/_preindex.csv'))


class TestRetrieveEmbeddings(unittest.TestCase):

  def test_different_dcids(self):
    preindexes = [
        PreIndex('foo', 'dcid1;dcid2'),
        PreIndex('bar', 'dcid3'),
    ]
    existing_embeddings = [
        Embedding(PreIndex('foo', 'dcid1'), [0.1, 0.2, 0.3]),
        Embedding(PreIndex('bar', 'dcid3;dcid2'), [0.4, 0.5, 0.6]),
        Embedding(PreIndex('fooz', 'dcid4'), [0.7, 0.7, 0.7]),
    ]
    got = utils.compute_embeddings(None, preindexes, existing_embeddings)
    expected = [
        Embedding(PreIndex('bar', 'dcid3'), [0.4, 0.5, 0.6]),
        Embedding(PreIndex('foo', 'dcid1;dcid2'), [0.1, 0.2, 0.3]),
    ]
    print(got)
    self.assertEqual(got, expected)
