# Copyright 2023 Google LLC
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

import os
import sys

from absl import app
from absl import flags
from file_util import create_file_handler
from file_util import FileHandler
from google.cloud import storage
import pandas as pd
import utils
import yaml

# Import gcs module from shared lib.
# Since this tool is run standalone from this directory,
# the shared lib directory needs to be appended to the sys path.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_SHARED_LIB_DIR = os.path.join(_THIS_DIR, "..", "..", "..", "shared", "lib")
sys.path.append(_SHARED_LIB_DIR)
import gcs  # type: ignore

FLAGS = flags.FLAGS


class Mode:
  BUILD = "build"
  DOWNLOAD = "download"


flags.DEFINE_enum(
    "mode",
    Mode.BUILD,
    [Mode.BUILD, Mode.DOWNLOAD],
    f"Mode of operation",
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
flags.DEFINE_string(
    "embeddings_yaml_path", "/datacommons/nl/embeddings.yaml",
    "Path where the default FT embeddings.yaml will be saved for Custom DC in download mode."
)

EMBEDDINGS_CSV_FILENAME_PREFIX = "custom_embeddings"
EMBEDDINGS_YAML_FILE_NAME = "custom_embeddings.yaml"


def download(embeddings_yaml_path: str):
  """Downloads the default FT model and embeddings.
  """
  ctx = _ctx_no_model()

  default_ft_embeddings_info = utils.get_default_ft_embeddings_info()

  # Download model.
  model_info = default_ft_embeddings_info.model_config
  print(f"Downloading default model: {model_info.name}")
  local_model_path = utils.get_or_download_model_from_gcs(
      ctx, model_info.info['gcs_folder'])
  print(f"Downloaded default model to: {local_model_path}")

  # Download embeddings.
  embeddings_file_name = default_ft_embeddings_info.index_config['embeddings']
  print(f"Downloading default embeddings: {embeddings_file_name}")
  local_embeddings_path = gcs.maybe_download(embeddings_file_name,
                                             use_anonymous_client=True)
  if not local_embeddings_path:
    print(f"Unable to download default embeddings: {embeddings_file_name}")
  else:
    print(f"Downloaded default embeddings to: {local_embeddings_path}")

  # The prod embeddings.yaml includes multiple embeddings (default, biomed, UN)
  # For custom DC, we only want the default.
  utils.save_embeddings_yaml_with_only_default_ft_embeddings(
      embeddings_yaml_path, default_ft_embeddings_info)


def build(model_info: utils.ModelConfig, sv_sentences_csv_path: str,
          output_dir: str):
  print(f"Downloading model: {model_info.name}")
  ctx = _download_model(model_info.info['gcs_folder'])

  print(
      f"Generating embeddings dataframe from SV sentences CSV: {sv_sentences_csv_path}"
  )
  sv_sentences_csv_handler = create_file_handler(sv_sentences_csv_path)
  embeddings_df = _build_embeddings_dataframe(ctx, sv_sentences_csv_handler)

  print("Validating embeddings.")
  utils.validate_embeddings(embeddings_df, sv_sentences_csv_path)

  output_dir_handler = create_file_handler(output_dir)
  embeddings_csv_handler = create_file_handler(
      output_dir_handler.join(
          f"{EMBEDDINGS_CSV_FILENAME_PREFIX}.{model_info.name}.csv"))
  embeddings_yaml_handler = create_file_handler(
      output_dir_handler.join(EMBEDDINGS_YAML_FILE_NAME))

  print(f"Saving embeddings CSV: {embeddings_csv_handler.path}")
  embeddings_csv = embeddings_df.to_csv(index=False)
  embeddings_csv_handler.write_string(embeddings_csv)

  print(f"Saving embeddings yaml: {embeddings_yaml_handler.path}")
  generate_embeddings_yaml(model_info, embeddings_csv_handler,
                           embeddings_yaml_handler)

  print("Done building custom DC embeddings.")


def _build_embeddings_dataframe(
    ctx: utils.Context, sv_sentences_csv_handler: FileHandler) -> pd.DataFrame:
  sv_sentences_df = pd.read_csv(sv_sentences_csv_handler.read_string_io())

  # Dedupe texts
  (text2sv_dict, _) = utils.dedup_texts(sv_sentences_df)

  print("Building custom DC embeddings")
  return utils.build_embeddings(ctx, text2sv_dict)


def generate_embeddings_yaml(model_info: utils.ModelConfig,
                             embeddings_csv_handler: FileHandler,
                             embeddings_yaml_handler: FileHandler):
  #
  # Right now Custom DC only supports LOCAL mode.
  #
  assert model_info.info['type'] == 'LOCAL'

  data = {
      "version": 1,
      "indexes": {
          "custom_ft": {
              "embeddings": embeddings_csv_handler.abspath(),
              "model": model_info.name,
              "store": "MEMORY",
          }
      },
      "models": {
          model_info.name: model_info.info,
      }
  }
  embeddings_yaml_handler.write_string(yaml.dump(data))


def _download_model(model_version: str) -> utils.Context:
  ctx_no_model = _ctx_no_model()
  model = utils.get_ft_model_from_gcs(ctx_no_model, model_version)
  return utils.Context(model=model,
                       model_endpoint=None,
                       bucket=ctx_no_model.bucket)


def _ctx_no_model() -> utils.Context:
  bucket = storage.Client.create_anonymous_client().bucket(
      utils.DEFAULT_MODELS_BUCKET)
  return utils.Context(model=None, model_endpoint=None, bucket=bucket)


def main(_):
  if FLAGS.mode == Mode.DOWNLOAD:
    download(FLAGS.embeddings_yaml_path)
    return

  assert FLAGS.sv_sentences_csv_path
  assert FLAGS.output_dir
  if FLAGS.model_version:
    model_info = utils.ModelConfig(name=FLAGS.model_version,
                                   info={
                                       'type': 'LOCAL',
                                       'gcs_folder': FLAGS.model_version,
                                       'score_threshold': 0.5
                                   })
  else:
    model_info = utils.get_default_ft_model()
    print(f"Using model {model_info.name} from embeddings.yaml.")

  build(model_info, FLAGS.sv_sentences_csv_path, FLAGS.output_dir)


if __name__ == "__main__":
  app.run(main)
