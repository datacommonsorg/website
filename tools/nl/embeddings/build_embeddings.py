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
"""Build the embeddings index from stat var descriptions."""

import os
from pathlib import Path

from absl import app
from absl import flags

from tools.nl.embeddings import utils
from nl_server import config_reader

FLAGS = flags.FLAGS

flags.DEFINE_string('embeddings_name', '',
                    'Embeddings name as specified in catalog.yaml')

flags.DEFINE_string('gcs_root', '',
                    'The output GCS path root to save the embeddings files/db')

_THIS_DIR = Path(__file__).parent.resolve()


def main(_):
  # Get embeddings_name
  embeddings_name = FLAGS.embeddings_name
  assert embeddings_name

  # Prepare the model
  catalog = config_reader.read_catalog()
  index_config = catalog.indexes[embeddings_name]
  env = config_reader.read_env()
  model = utils.get_model(catalog, env, index_config.model)

  # Construct a file manager
  input_dir = os.path.join(_THIS_DIR, 'data', 'curated_input',
                           index_config.source_folder)
  output_dir = utils.make_local_dir(index_config.source_folder,
                                    index_config.model)
  fm = utils.FileManager(input_dir, output_dir)

  # Build and save preindex
  texts, dcids = utils.build_preindex(fm, save=True)

  # Compute embeddings
  embeddings = utils.compute_embeddings(texts, model)

  # Save embeddings
  if index_config.store_type == 'MEMORY':
    utils.save_embeddings_memory(fm.local_output_dir(), texts, dcids,
                                 embeddings)
  elif index_config.store_type == 'LANCEDB':
    utils.save_embeddings_lancedb(fm.local_output_dir(), texts, dcids,
                                  embeddings)
  else:
    raise ValueError(f'Unknown store type: {index_config.store_type}')

  fm.maybe_upload_to_gcs()


if __name__ == "__main__":
  app.run(main)
