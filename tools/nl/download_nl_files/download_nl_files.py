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
"""Function to download all the nl files in catalog.yaml from gcs to a cache
folder"""

from absl import app
from absl import flags
import yaml

from nl_server import config_reader
from nl_server.cache import DOCKER_DATA_FOLDER_PATH
from nl_server.config import ModelType
from nl_server.config import StoreType
from shared.lib import gcs

FLAGS = flags.FLAGS

flags.DEFINE_string(
    'catalog_path', 'catalog.yaml',
    'path to the catalog.yaml file, which is the main config file for NL models and embeddings'
)
flags.DEFINE_bool(
    'is_docker_mode', False,
    'If is_docker_mode is True, download files to docker specific folder path.')


def main(_):
  # Read the catalog yaml
  catalog_dict = {}
  with open(FLAGS.catalog_path) as f:
    catalog_dict = yaml.full_load(f)
  catalog = config_reader.read_catalog(catalog_dict=catalog_dict,
                                       catalog_paths=[])

  # Get the path to the cache to download the files to
  cache_root = "/tmp"
  if FLAGS.is_docker_mode:
    cache_root = DOCKER_DATA_FOLDER_PATH

  # Download all the models of LOCAL type
  for model_info in catalog.models.values():
    if model_info.type != ModelType.LOCAL:
      continue
    gcs.maybe_download(model_info.gcs_folder,
                       cache_root,
                       use_anonymous_client=True)

  # Download all the indexes that are MEMORY store type
  for index_info in catalog.indexes.values():
    if not index_info.store_type in [StoreType.MEMORY]:
      continue
    if gcs.is_gcs_path(index_info.embeddings_path):
      gcs.maybe_download(index_info.embeddings_path,
                         cache_root,
                         use_anonymous_client=True)
    path = index_info.embeddings_path
    print(f'finished downloading {path}')


if __name__ == '__main__':
  app.run(main)
