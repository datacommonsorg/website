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

import logging
import sys
from typing import Dict

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


def _init_logger():
  # Log to stdout for easy redirect of the output text.
  # This enables the logs to be captured by the admin tool.
  logger = logging.getLogger()
  logger.setLevel(logging.INFO)
  handler = logging.StreamHandler(sys.stdout)
  handler.setLevel(logging.INFO)
  logger.addHandler(handler)


def main(_):
  _init_logger()

  # Get embeddings_name
  embeddings_name = FLAGS.embeddings_name
  output_dir = FLAGS.output_dir
  assert embeddings_name, output_dir

  # Prepare the model
  custom_catalog: Dict = None
  if FLAGS.catalog:
    custom_catalog = yaml.safe_load(FLAGS.catalog)
    logging.info('Custom catalog: %s', custom_catalog)

  catalog = config_reader.read_catalog(catalog_dict=custom_catalog)
  index_config = catalog.indexes[embeddings_name]
  logging.info('Index config: %s', index_config)
  # Use default env config: autopush for base DCs and custom env for custom DCs.
  env = config_reader.read_env()
  model = utils.get_model(catalog, env, index_config.model)

  # Construct a file manager
  input_dir = index_config.source_path
  fm = utils.FileManager(input_dir, output_dir)

  # Build and save preindex
  preindexes = utils.build_and_save_preindexes(fm)

  # Load existing embeddings from previous run.
  existing_embeddings = utils.load_existing_embeddings(
      index_config.embeddings_path)

  # Compute embeddings
  final_embeddings = utils.compute_embeddings(model, preindexes,
                                              existing_embeddings)

  # Save embeddings
  if index_config.store_type == 'MEMORY':
    utils.save_embeddings_memory(fm.local_output_dir(), final_embeddings)
  elif index_config.store_type == 'LANCEDB':
    utils.save_embeddings_lancedb(fm.local_output_dir(), final_embeddings)
  else:
    raise ValueError(f'Unknown store type: {index_config.store_type}')
  logging.info("Saved embeddings.")

  # Save index config
  utils.save_index_config(fm, index_config)
  logging.info("Saved index config.")

  # Save custom catalog
  if custom_catalog:
    utils.save_custom_catalog(fm, custom_catalog)
    logging.info("Saved custom catalog.")

  # Upload to GCS if needed
  fm.maybe_upload_to_gcs()

  logging.info("Build embeddings done.")


if __name__ == "__main__":
  app.run(main)
