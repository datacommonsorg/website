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

from absl import app
from absl import flags
import pandas as pd
import yaml

from nl_server import config
from nl_server import config_reader
from nl_server.config import CatalogConfig
from nl_server.config import MemoryIndexConfig
from nl_server.registry import ResourceRegistry
from tools.nl.embeddings import utils
from tools.nl.embeddings.file_util import create_file_handler
from tools.nl.embeddings.file_util import FileHandler


class Mode:
  BUILD = "build"
  DOWNLOAD = "download"


FLAGS = flags.FLAGS

flags.DEFINE_enum(
    "mode",
    Mode.BUILD,
    [Mode.BUILD, Mode.DOWNLOAD],
    "Mode of operation",
)

flags.DEFINE_string(
    "model_version", None,
    "Existing finetuned model folder name on GCS (e.g. 'ft_final_v20230717230459.all-MiniLM-L6-v2'). If not specified, the version will be parsed from embeddings.yaml."
)
flags.DEFINE_string("sv_sentences_csv_path", None,
                    "Path to the custom DC SV sentences path.")
flags.DEFINE_string(
    "output_dir", None,
    "Output directory where the generated embeddings will be saved.")

EMBEDDINGS_CSV_FILENAME_PREFIX = "custom_embeddings"
EMBEDDINGS_YAML_FILE_NAME = "custom_embeddings.yaml"

DEFAULT_EMBEDDINGS_INDEX_TYPE = "medium_ft"


def build_registry():
  """Downloads the default model and embeddings."""
  # Only use the default model.
  runtime_config = config_reader.read_runtime_config()
  runtime_config.default_indexes = [DEFAULT_EMBEDDINGS_INDEX_TYPE]
  runtime_config.enabled_indexes = [DEFAULT_EMBEDDINGS_INDEX_TYPE]
  runtime_config.enable_reranking = False

  # Construct server_config
  catalog_config = config_reader.read_catalog_config()
  server_config = config_reader.get_server_config(catalog_config,
                                                  runtime_config)
  # Build registry, this will download the models and embeddings to the local
  # tmp dir.
  return ResourceRegistry(server_config)


def build(r: ResourceRegistry, sv_sentences_csv_path: str, output_dir: str):
  print(
      f"Generating embeddings dataframe from SV sentences CSV: {sv_sentences_csv_path}"
  )
  sv_sentences_csv_handler = create_file_handler(sv_sentences_csv_path)

  server_config = r.server_config()
  index_config = server_config.indexes[DEFAULT_EMBEDDINGS_INDEX_TYPE]
  model_name = index_config.model
  model_info = server_config.models[model_name]

  print("Building custom DC embeddings")
  ctx = utils.Context(model=r.get_model(model_name),
                      model_endpoint=None,
                      bucket=None)

  embeddings_df = _build_embeddings_dataframe(ctx, sv_sentences_csv_handler)

  print("Validating embeddings.")
  utils.validate_embeddings(embeddings_df, sv_sentences_csv_path)

  output_dir_handler = create_file_handler(output_dir)
  embeddings_csv_handler = create_file_handler(
      output_dir_handler.join(
          f"{EMBEDDINGS_CSV_FILENAME_PREFIX}.{model_name}.csv"))
  embeddings_yaml_handler = create_file_handler(
      output_dir_handler.join(EMBEDDINGS_YAML_FILE_NAME))

  print(f"Saving embeddings CSV: {embeddings_csv_handler.path}")
  embeddings_csv = embeddings_df.to_csv(index=False)
  embeddings_csv_handler.write_string(embeddings_csv)

  print(f"Saving embeddings yaml: {embeddings_yaml_handler.path}")
  generate_embeddings_yaml(model_name, model_info, embeddings_csv_handler,
                           embeddings_yaml_handler)

  print("Done building custom DC embeddings.")


def _build_embeddings_dataframe(
    ctx: utils.Context, sv_sentences_csv_handler: FileHandler) -> pd.DataFrame:
  sv_sentences_df = pd.read_csv(sv_sentences_csv_handler.read_string_io())

  # Dedupe texts
  (text2sv_dict, _) = utils.dedup_texts(sv_sentences_df)

  print("Building custom DC embeddings")
  return utils.build_embeddings(ctx, text2sv_dict)


def generate_embeddings_yaml(model_name: str, model_config: config.ModelConfig,
                             embeddings_csv_handler: FileHandler,
                             embeddings_yaml_handler: FileHandler):
  # Right now Custom DC only supports LOCAL mode.
  assert model_config.type == 'LOCAL'

  data = CatalogConfig(
      version=1,
      indexes={
          "custom_ft":
              MemoryIndexConfig(
                  embeddings_path=embeddings_csv_handler.abspath(),
                  model=model_name,
                  store_type="MEMORY")
      },
      models={
          model_name: model_config,
      })
  embeddings_yaml_handler.write_string(yaml.dump(asdict(data)))


def main(_):
  # build registry will download models.
  r = build_registry()
  if FLAGS.mode == Mode.DOWNLOAD:
    return
  else:
    assert FLAGS.sv_sentences_csv_path
    assert FLAGS.output_dir
    build(r, FLAGS.sv_sentences_csv_path, FLAGS.output_dir)


if __name__ == "__main__":
  app.run(main)
