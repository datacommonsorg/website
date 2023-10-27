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

import pandas as pd
import utils
import yaml


def build_embeddings_dataframe(ctx: utils.Context,
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
  data = {"custom_ft": embeddings_csv_path}
  with open(embeddings_yaml_path, "w") as f:
    yaml.dump(data, f)
