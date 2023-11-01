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
"""Common Utility functions for Embeddings."""

from dataclasses import dataclass
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Tuple

import pandas as pd
from sentence_transformers import SentenceTransformer
import yaml

# Col names in the input files/sheets.
DCID_COL = 'dcid'

NAME_COL = 'Name'
DESCRIPTION_COL = 'Description'
CURATED_ALTERNATIVES_COL = 'Curated_Alternatives'
OVERRIDE_COL = 'Override_Alternatives'

ALTERNATIVES_COL = 'Alternatives'

# Col names in the concatenated dataframe.
COL_ALTERNATIVES = 'sentence'

_EMBEDDINGS_YAML_PATH = "../../../deploy/nl/embeddings.yaml"
_DEFAULT_EMBEDDINGS_INDEX_TYPE = "medium_ft"
"""The embeddings filename pattern in embeddings.yaml.

Expect: <embeddings_version>.<fine-tuned-model-version>.<base-model>.csv
Example: embeddings_sdg_2023_09_12_16_38_04.ft_final_v20230717230459.all-MiniLM-L6-v2.csv

Model version: <fine-tuned-model-version>.<base-model>
Example: ft_final_v20230717230459.all-MiniLM-L6-v2

If a string matches this pattern, the first group is the model version.
"""
_EMBEDDINGS_FILENAME_PATTERN = r"^[^.]+\.([^.]+\.[^.]+)\.csv$"


@dataclass
class Context:
  # gspread client
  gs: Any
  # Model
  model: Any
  # GCS storage bucket
  bucket: Any
  # Temp dir
  tmp: str = "/tmp"


def two_digits(number: int) -> str:
  return str(number).zfill(2)


def get_local_alternatives(local_filename: str,
                           local_col_names: List[str]) -> pd.DataFrame:
  df = pd.read_csv(local_filename).fillna("")
  df = df[local_col_names]
  return df


def merge_dataframes(df_1: pd.DataFrame, df_2: pd.DataFrame) -> pd.DataFrame:
  # In case there is a column (besides DCID_COL) which is common, the merged copy
  # will contain two columns (one with a postfix _x and one with a postfix _y.
  # Concatenate the two to produce a final version.
  df_1 = df_1.merge(df_2, how='left', on=DCID_COL,
                    suffixes=("_x", "_y")).fillna("")

  # Determine the columns which were common.
  common_cols = set()
  for col in df_1.columns:
    if col.endswith("_x") or col.endswith("_y"):
      common_cols.add(col.replace("_x", "").replace("_y", ""))

  # Replace the common columns with their concatenation.
  for col in common_cols:
    df_1[col] = df_1[f"{col}_x"].str.cat(df_1[f"{col}_y"], sep=";")
    df_1[col] = df_1[col].replace(to_replace="^;", value="", regex=True)
    df_1 = df_1.drop(columns=[f"{col}_x", f"{col}_y"])

  return df_1


def concat_alternatives(alternatives: List[str],
                        max_alternatives,
                        delimiter=";") -> str:
  alts = set(alternatives[0:max_alternatives])
  return f"{delimiter}".join(sorted(alts))


def split_alt_string(alt_string: str) -> List[str]:
  alts = []
  for alt in alt_string.split(";"):
    if alt:
      alts.append(alt.strip())
  return alts


def add_sv(name: str, sv: str, text2sv: Dict[str, str],
           dup_svs: List[List[str]]) -> None:
  osv = text2sv.get(name)
  if not osv or osv == sv:
    text2sv[name] = sv
    return

  # This is a case of duplicate SV.  Prefer the non sdg, human-curated, shorter SV.
  # Track it.
  pref, drop = sv, osv
  if sv.startswith('dc/topic/sdg'):
    # sv is an sdg topic. Prefer osv if osv is not an sdg topic. Otherwise, go
    # by dcid len.
    if not osv.startswith('dc/topic/sdg') or len(osv) <= len(sv):
      pref, drop = osv, sv
  elif ((osv.startswith('dc/') and sv.startswith('dc/')) or
        (not osv.startswith('dc/') and not sv.startswith('dc/'))):
    # Both SVs are autogen or both aren't. Go by dcid len.
    if len(osv) <= len(sv):
      pref, drop = osv, sv
  elif sv.startswith('dc/'):
    # sv is autogen, prefer osv.
    pref, drop = osv, sv

  text2sv[name] = pref
  dup_svs.append([pref, drop, name])


def dedup_texts(df: pd.DataFrame) -> Tuple[Dict[str, str], List[List[str]]]:
  """Dedup multiple texts mapped to the same DCID and return a list."""
  text2sv_dict = {}
  dup_sv_rows = [['PreferredSV', 'DroppedSV', 'DuplicateName']]
  for _, row in df.iterrows():
    sv = row[DCID_COL].strip()

    # All alternative sentences are retrieved from COL_ALTERNATIVES, which
    # are expected to be delimited by ";" (semi-colon).
    if COL_ALTERNATIVES in row:
      alternatives = row[COL_ALTERNATIVES].split(';')
      alternatives = [a.strip() for a in alternatives if a.strip()]
      for alt in alternatives:
        add_sv(alt, sv, text2sv_dict, dup_sv_rows)

  return (text2sv_dict, dup_sv_rows)


def get_texts_dcids(
    text2sv_dict: Dict[str, str]) -> Tuple[List[str], List[str]]:
  texts = sorted(list(text2sv_dict.keys()))
  dcids = [text2sv_dict[k] for k in texts]
  return (texts, dcids)


def _download_model_from_gcs(ctx: Context, model_folder_name: str) -> str:
  # TODO: deprecate this in favor of the function  in nl_server.gcs
  """Downloads a Sentence Tranformer model (or finetuned version) from GCS.

  Args:
    ctx: Context which has the GCS bucket information.
    model_folder_name: the GCS bucket name for the model.
  
  Returns the path to the local directory where the model was downloaded to.
  The downloaded model can then be loaded as:

  ```
      downloaded_model_path = _download_model_from_gcs(ctx, gcs_model_folder_name)
      model = SentenceTransformer(downloaded_model_path)
  ```
  """
  local_dir = ctx.tmp
  # Get list of files
  blobs = ctx.bucket.list_blobs(prefix=model_folder_name)
  for blob in blobs:
    file_split = blob.name.split("/")
    directory = local_dir
    for p in file_split[0:-1]:
      directory = os.path.join(directory, p)
    Path(directory).mkdir(parents=True, exist_ok=True)

    if blob.name.endswith("/"):
      continue
    blob.download_to_filename(os.path.join(directory, file_split[-1]))

  return os.path.join(local_dir, model_folder_name)


def build_embeddings(ctx, texts: List[str], dcids: List[str]) -> pd.DataFrame:
  """Builds the embeddings dataframe.
  
  Texts and dcids should be of equal length such that
  a text at a given index corresponds to the dcid at that index.

  The output dataframe contains the embeddings columns (typically 384) + dcid + sentence.
  """
  assert len(texts) == len(dcids)

  embeddings = ctx.model.encode(texts, show_progress_bar=True)
  embeddings = pd.DataFrame(embeddings)
  embeddings[DCID_COL] = dcids
  embeddings[COL_ALTERNATIVES] = texts
  return embeddings


def get_or_download_model_from_gcs(ctx: Context, model_version: str) -> str:
  """Returns the local model path, downloading it if needed.
  
  If the model is already downloaded, it returns the model path.
  Otherwise, it downloads the model to the local file system and returns that path.
  """
  tuned_model_path: str = ""

  # Check if this model is already downloaded locally.
  if os.path.exists(os.path.join(ctx.tmp, model_version)):
    tuned_model_path = os.path.join(ctx.tmp, model_version)
    print(f"Model already downloaded at path: {tuned_model_path}")
  else:
    print("Model not previously downloaded locally. Downloading from GCS.")
    tuned_model_path = _download_model_from_gcs(ctx, model_version)
    print(f"Model downloaded locally to: {tuned_model_path}")

  return tuned_model_path


def get_ft_model_from_gcs(ctx: Context,
                          model_version: str) -> SentenceTransformer:
  model_path = get_or_download_model_from_gcs(ctx, model_version)
  return SentenceTransformer(model_path)


def get_default_ft_model_version() -> str:
  """Gets the default index's (i.e. 'medium_ft') model version from embeddings.yaml.
  
  It will raise an error if the file or default index is not found or
  if the value does not conform to the pattern:
  <embeddings_version>.<fine-tuned-model-version>.<base-model>.csv
  Example: embeddings_sdg_2023_09_12_16_38_04.ft_final_v20230717230459.all-MiniLM-L6-v2.csv
  """
  return _get_default_ft_model_version(_EMBEDDINGS_YAML_PATH)


def _get_default_ft_model_version(embeddings_yaml_file_path: str) -> str:
  with open(embeddings_yaml_file_path, "r") as f:
    data = yaml.full_load(f)
    if _DEFAULT_EMBEDDINGS_INDEX_TYPE not in data:
      raise ValueError(f"{_DEFAULT_EMBEDDINGS_INDEX_TYPE} not found.")
    value = data[_DEFAULT_EMBEDDINGS_INDEX_TYPE]
    matcher = re.match(_EMBEDDINGS_FILENAME_PATTERN, value)
    if not matcher:
      raise ValueError(f"Invalid embeddings filename value: {value}")
    return matcher.group(1)


def validate_embeddings(embeddings_df: pd.DataFrame,
                        output_dcid_sentences_filepath: str) -> None:
  # Verify that embeddings were created for all DCIDs and Sentences.
  dcid_sentence_df = pd.read_csv(output_dcid_sentences_filepath).fillna("")
  sentences = set()
  for alts in dcid_sentence_df["sentence"].values:
    for s in alts.split(";"):
      s = s.strip()
      if not s:
        continue
      sentences.add(s)

  # Verify that each of the texts in the embeddings_df is in the sentences set
  # and that all the sentences in the set are in the embeddings_df. Finally, also
  # verify that embeddings_df has no duplicate sentences.
  embeddings_sentences = embeddings_df['sentence'].values
  embeddings_sentences_unique = set()
  for s in embeddings_sentences:
    assert s in sentences, f"Embeddings sentence not found in processed output file. Sentence: {s}"
    assert s not in embeddings_sentences_unique, f"Found multiple instances of sentence in embeddings. Sentence: {s}."
    embeddings_sentences_unique.add(s)

  for s in sentences:
    assert s in embeddings_sentences_unique, f"Output File sentence not found in Embeddings. Sentence: {s}"

  # Verify that the number of columns = length of the embeddings vector + one each for the
  # dcid and sentence columns.
  assert len(embeddings_df.columns), 384 + 2
