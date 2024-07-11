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

import logging
import os
import shutil
import tempfile

from shared.lib import gcs

_PREINDEX_CSV = '_preindex.csv'
_INDEX_CONFIG_YAML = 'index_config.yaml'
_CUSTOM_CATALOG_YAML = 'custom_catalog.yaml'


class FileManager(object):

  def __init__(self, input_dir: str, output_dir: str):
    # Add trailing '/' if not present
    self._input_dir = os.path.join(input_dir, '')
    self._output_dir = os.path.join(output_dir, '')
    # Create a local dir to hold local input and output files
    self._local_dir = tempfile.mkdtemp()

    # Set local input directory
    if gcs.is_gcs_path(self._input_dir):
      self._local_input_dir = os.path.join(self._local_dir, 'input')
      os.mkdir(self._local_input_dir)
      gcs.download_blob_by_path(self._input_dir, self._local_input_dir)
    else:
      self._local_input_dir = self._input_dir

    # Set local output directory
    if gcs.is_gcs_path(output_dir):
      self._local_output_dir = os.path.join(self._local_dir, 'output')
    else:
      self._local_output_dir = output_dir
    # Create local output directory if it does not exist.
    os.makedirs(self._local_output_dir, exist_ok=True)

  def __del__(self):
    shutil.rmtree(self._local_dir)

  def local_input_dir(self):
    return self._local_input_dir

  def local_output_dir(self):
    return self._local_output_dir

  def output_dir(self):
    return self._output_dir

  def preindex_csv_path(self):
    return os.path.join(self._local_input_dir, _PREINDEX_CSV)

  def index_config_path(self):
    return os.path.join(self._local_output_dir, _INDEX_CONFIG_YAML)

  def custom_catalog_path(self):
    return os.path.join(self._local_output_dir, _CUSTOM_CATALOG_YAML)

  def maybe_upload_to_gcs(self):
    """
    Upload the generated files to GCS if the input or output paths are GCS.
    """
    if gcs.is_gcs_path(self._input_dir):
      # This is to upload any generated files in the input directory to GCS
      logging.info("Uploading input dir to GCS path: %s", self._input_dir)
      gcs.upload_by_path(self._local_input_dir, self._input_dir)
    if gcs.is_gcs_path(self._output_dir):
      logging.info("Uploading output dir to GCS path: %s", self._output_dir)
      gcs.upload_by_path(self._local_output_dir, self._output_dir)
