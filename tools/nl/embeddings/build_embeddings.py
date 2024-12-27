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

from absl import app
from absl import flags

from nl_server import config_reader
from tools.nl.embeddings import utils

FLAGS = flags.FLAGS

flags.DEFINE_string('embeddings_name', '',
                    'Embeddings name as specified in catalog.yaml')

flags.DEFINE_string('output_dir', '',
                    'The output directory to save the embeddings files/db')

flags.DEFINE_string(
    'additional_catalog_path', '',
    'Path to an additional catalog yaml file. Can be a local or a GCS path')


def _init_logger():
  # Remove existing handlers from root handler that were set by absl library
  for handler in logging.root.handlers:
    logging.root.removeHandler(handler)

  # Log to stdout for easy redirect of the output text.
  # This enables the logs to be captured by the admin tool.
  logger = logging.getLogger()
  handler = logging.StreamHandler(sys.stdout)
  handler.setLevel(logging.INFO)

  # Create a formatter to format the log messages
  formatter = logging.Formatter(
      "[%(asctime)s %(levelname)s %(filename)s:%(lineno)d] %(message)s")
  handler.setFormatter(formatter)

  # Add the handler to the logger
  logger.addHandler(handler)


def main(_):
  _init_logger()

  # Get embeddings_name
  embeddings_name = FLAGS.embeddings_name
  output_dir = FLAGS.output_dir

  assert embeddings_name, output_dir

  catalog = config_reader.read_catalog(
      additional_catalog_path=FLAGS.additional_catalog_path)
  index_config = catalog.indexes[embeddings_name]
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

  # Save index config
  utils.save_index_config(fm, index_config)

  # Upload to GCS if needed
  fm.maybe_upload_to_gcs()


if __name__ == "__main__":
  app.run(main)
