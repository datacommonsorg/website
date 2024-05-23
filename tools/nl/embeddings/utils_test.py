# Copyright 2023 Google LLC
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

from pathlib import Path
import unittest

from tools.nl.embeddings import utils

INPUT_DIR = Path(__file__).parent / "testdata/custom_dc/input"


class TestUtils(unittest.TestCase):

  def test_get_default_ft_model_version_failure(self):
    embeddings_file_path = f"{INPUT_DIR}/bad_embeddings.yaml"

    with self.assertRaises(Exception):
      utils._get_default_ft_model(embeddings_file_path)
