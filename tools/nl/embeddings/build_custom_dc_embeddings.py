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
"""Build embeddings for custom DCs."""

from dataclasses import asdict
import os
from pathlib import Path
import shutil
import tempfile

from absl import app
from absl import flags
import pandas as pd
import yaml

from nl_server import config_reader
from nl_server import registry
from nl_server.config import Catalog
from nl_server.config import MemoryIndexConfig
from nl_server.config import ModelConfig
from nl_server.embeddings import EmbeddingsModel
from shared.lib import gcs
from tools.nl.embeddings import utils

FLAGS = flags.FLAGS

flags.DEFINE_string("input_file_path", None, "Path to the SV sentences path.")
flags.DEFINE_string(
    "output_dir", None,
    "Output directory where the generated embeddings will be saved.")

EMBEDDINGS_FILE_NAME = "embeddings.csv"
CATALOG_FILE_NAME = "custom_catalog.yaml"
DEFAULT_EMBEDDINGS_INDEX_TYPE = "medium_ft"


class FileManager(object):

  def __init__(self, input_file_path: str, output_dir: str):
    self.input_file_path = input_file_path
    self.output_dir = output_dir
    self.local_dir = tempfile.mkdtemp()
    if gcs.is_gcs_path(input_file_path):
      self.local_input_file_path = os.path.join(self.local_dir,
                                                'sv_sentences.csv')
      gcs.download_blob_by_path(input_file_path, self.local_input_file_path)
    else:
      self.local_input_file_path = input_file_path

    self.local_embeddings_path = os.path.join(self.local_dir,
                                              EMBEDDINGS_FILE_NAME)
    self.final_embeddings_path = os.path.join(output_dir, EMBEDDINGS_FILE_NAME)

  def save_output(self):
    if gcs.is_gcs_path(self.output_dir):
      gcs.upload_blob_by_path(
          self.local_embeddings_path,
          self.final_embeddings_path,
      )
    else:
      Path(self.output_dir).mkdir(parents=True, exist_ok=True)
      shutil.copy(self.local_embeddings_path, self.final_embeddings_path)


def save_custom_dc_artifacts(model_name: str, model_config: ModelConfig,
                             file_manager: FileManager):
  catalog = Catalog(
      version="1",
      indexes={
          "custom_ft":
              MemoryIndexConfig(
                  embeddings_path=file_manager.final_embeddings_path,
                  model=model_name,
                  store_type="MEMORY")
      },
      models={
          model_name: model_config,
      })
  local_catalog_path = os.path.join(file_manager.local_dir, CATALOG_FILE_NAME)
  final_catalog_path = os.path.join(file_manager.output_dir, CATALOG_FILE_NAME)
  with open(local_catalog_path, 'w') as f:
    yaml.dump(asdict(catalog), f)
  if gcs.is_gcs_path(file_manager.output_dir):
    gcs.upload_blob_by_path(local_catalog_path, final_catalog_path)
  else:
    shutil.copy(local_catalog_path, final_catalog_path)


def build(model: EmbeddingsModel, local_csv_path: str,
          local_embeddings_path: str):

  print(
      f"Generating embeddings dataframe from SV sentences CSV: {local_csv_path}"
  )

  print("Building custom DC embeddings")
  sv_sentences_df = pd.read_csv(local_csv_path)

  # Dedupe texts
  (text2sv_dict, _) = utils.dedup_texts(sv_sentences_df)

  print("Building custom DC embeddings")
  embeddings_df = utils.build_embeddings(text2sv_dict, model=model)

  print("Validating embeddings.")
  utils.validate_embeddings(embeddings_df, local_csv_path)

  print(f"Saving embeddings CSV")
  embeddings_df.to_csv(local_embeddings_path, index=False)

  print("Done building custom DC embeddings.")


def main(_):
  assert FLAGS.input_file_path
  assert FLAGS.output_dir

  # Prepare the model
  catalog = config_reader.read_catalog()
  index_config = catalog.indexes[DEFAULT_EMBEDDINGS_INDEX_TYPE]
  model_name = index_config.model
  model_config = catalog.models[model_name]
  env = config_reader.read_env()
  if model_name in env.vertex_ai_models:
    vertex_ai_config = env.vertex_ai_models[model_name]
    model_config = config_reader.merge_vertex_ai_configs(
        model_config, vertex_ai_config)
  model = registry.create_model(model_config)

  # Build the embeddings
  file_manager = FileManager(FLAGS.input_file_path, FLAGS.output_dir)
  build(model, file_manager.local_input_file_path,
        file_manager.local_embeddings_path)
  file_manager.save_output()

  # Do custom DC specific stuff
  save_custom_dc_artifacts(model_name, model_config, file_manager)

  # Copy the embeddings to the output directory
  print(f"Copying embeddings csv to output dir")


if __name__ == "__main__":
  app.run(main)
