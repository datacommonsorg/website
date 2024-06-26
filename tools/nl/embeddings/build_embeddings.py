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
"""Build the embeddings index from variable and topic descriptions."""

from absl import app
from absl import flags
import yaml

from nl_server import config_reader
from tools.nl.embeddings import utils

FLAGS = flags.FLAGS

flags.DEFINE_string('embeddings_name', '',
                    'Embeddings name as specified in catalog.yaml')

flags.DEFINE_string('output_dir', '',
                    'The output directory to save the embeddings files/db')

flags.DEFINE_string('catalog', '',
                    'A dict of user provided embeddings/model catalog')


def main(_):
  # Get embeddings_name
  embeddings_name = FLAGS.embeddings_name
  output_dir = FLAGS.output_dir
  assert embeddings_name, output_dir

  # Prepare the model
  if FLAGS.catalog:
    catalog = yaml.safe_load(FLAGS.catalog)
  else:
    catalog = None
  catalog = config_reader.read_catalog(catalog_dict=catalog)
  index_config = catalog.indexes[embeddings_name]
  # Use default env config: autopush for base DCs and custom env for custom DCs.
  env = config_reader.read_env()
  model = utils.get_model(catalog, env, index_config.model)

  # Construct a file manager
  input_dir = index_config.source_path
  fm = utils.FileManager(input_dir, output_dir)

  # Build and save preindex
  target_sentences = utils.build_and_save_preindex(fm)

  # Load saved embeddings from previous run.
  saved_sentences = utils.get_saved_embeddings(index_config.embeddings_path)

  # Retrieve embeddings
  sentences = utils.retrieve_embeddings(model, target_sentences,
                                        saved_sentences)

  # Save embeddings
  if index_config.store_type == 'MEMORY':
    utils.save_embeddings_memory(fm.local_output_dir(), sentences)
  elif index_config.store_type == 'LANCEDB':
    utils.save_embeddings_lancedb(fm.local_output_dir(), sentences)
  else:
    raise ValueError(f'Unknown store type: {index_config.store_type}')

  # Save index config
  utils.save_index_config(fm, index_config)

  # Upload to GCS if needed
  fm.maybe_upload_to_gcs()


if __name__ == "__main__":
  app.run(main)
