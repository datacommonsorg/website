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

from absl import app
from absl import flags
from google.cloud import storage
import pandas as pd
import utils
import yaml

FLAGS = flags.FLAGS

flags.DEFINE_string(
    "model_version", None,
    "Existing finetuned model folder name on GCS (e.g. 'ft_final_v20230717230459.all-MiniLM-L6-v2'). If not specified, the version will be parsed from embeddings.yaml."
)
flags.DEFINE_string("sv_sentences_csv_path",
                    None,
                    "Path to the custom DC SV sentences path.",
                    required=True)
flags.DEFINE_string(
    "output_dir",
    None,
    "Output directory where the generated embeddings will be saved.",
    required=True)

MODELS_BUCKET = 'datcom-nl-models'
EMBEDDINGS_CSV_FILENAME = "custom_embeddings.csv"
EMBEDDINGS_YAML_FILE_NAME = "custom_embeddings.yaml"


def build(model_version: str, sv_sentences_csv_path: str, output_dir: str):
  print(f"Downloading model: {model_version}")
  ctx = _download_model(model_version)

  print(
      f"Generating embeddings dataframe from SV sentences CSV: {sv_sentences_csv_path}"
  )
  embeddings_df = _build_embeddings_dataframe(ctx, sv_sentences_csv_path)

  print("Validating embeddings.")
  utils.validate_embeddings(embeddings_df, sv_sentences_csv_path)

  embeddings_csv_path = os.path.join(output_dir, EMBEDDINGS_CSV_FILENAME)
  embeddings_yaml_path = os.path.join(output_dir, EMBEDDINGS_YAML_FILE_NAME)

  print(f"Saving embeddings CSV: {embeddings_csv_path}")
  embeddings_df.to_csv(embeddings_csv_path, index=False)

  print(f"Saving embeddings yaml: {embeddings_yaml_path}")
  generate_embeddings_yaml(embeddings_csv_path, embeddings_yaml_path)

  print("Done building custom DC embeddings.")


def _build_embeddings_dataframe(ctx: utils.Context,
                                sv_sentences_csv_path: str) -> pd.DataFrame:
  sv_sentences_df = pd.read_csv(sv_sentences_csv_path)

  # Dedupe texts
  (name2sv_dict, _) = utils.dedup_texts(sv_sentences_df)

  print("Getting texts and dcids.")
  (texts, dcids) = utils.get_texts_dcids(name2sv_dict)

  print("Building custom DC embeddings")
  return utils.build_embeddings(ctx, texts, dcids)


def generate_embeddings_yaml(embeddings_csv_path: str,
                             embeddings_yaml_path: str):
  embeddings_csv_path = os.path.abspath(embeddings_csv_path)
  data = {"custom_ft": embeddings_csv_path}
  with open(embeddings_yaml_path, "w") as f:
    yaml.dump(data, f)


def _download_model(model_version: str) -> utils.Context:
  bucket = storage.Client.create_anonymous_client().bucket(MODELS_BUCKET)
  ctx_no_model = utils.Context(gs=None, model=None, bucket=bucket)
  model = utils.get_ft_model_from_gcs(ctx_no_model, model_version)
  return utils.Context(gs=None, model=model, bucket=bucket)


def main(_):
  model_version = FLAGS.model_version
  if not model_version:
    model_version = utils.get_default_ft_model_version()
    print(f"Using model version {model_version} from embeddings.yaml.")

  build(model_version, FLAGS.sv_sentences_csv_path, FLAGS.output_dir)


if __name__ == "__main__":
  app.run(main)
