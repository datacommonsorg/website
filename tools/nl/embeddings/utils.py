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
from typing import Any, Dict, List, Tuple

import pandas as pd

# Col names in the input files/sheets.
DCID_COL = 'dcid'

NAME_COL = 'Name'
DESCRIPTION_COL = 'Description'
CURATED_ALTERNATIVES_COL = 'Curated_Alternatives'
OVERRIDE_COL = 'Override_Alternatives'

ALTERNATIVES_COL = 'Alternatives'

# Col names in the concatenated dataframe.
COL_ALTERNATIVES = 'sentence'


@dataclass
class Context:
  # gspread client
  gs: Any
  # Model
  model: Any
  # GCS storage bucket
  bucket: Any
  # Temp dir
  tmp: str


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

  # This is a case of duplicate SV.  Prefer the human-curated, shorter SV.
  # Track it.
  pref, drop = sv, osv
  if ((osv.startswith('dc/') and sv.startswith('dc/')) or
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


def download_model_from_gcs(ctx: Context, model_folder_name: str) -> str:
  # TODO: deprecate this in favor of the function  in nl_server.gcs
  """Downloads a Sentence Tranformer model (or finetuned version) from GCS.

  Args:
    ctx: Context which has the GCS bucket information.
    model_folder_name: the GCS bucket name for the model.
  
  Returns the path to the local directory where the model was downloaded to.
  The downloaded model can then be loaded as:

  ```
      downloaded_model_path = download_model_from_gcs(ctx, gcs_model_folder_name)
      model = SentenceTransformer(downloaded_model_path)
  ```
  """
  local_dir = ctx.tmp
  if local_dir[-1] != "/":
    local_dir += "/"
  # Get list of files
  blobs = ctx.bucket.list_blobs(prefix=model_folder_name)
  for blob in blobs:
    file_split = blob.name.split("/")
    directory = local_dir + "/".join(file_split[0:-1])
    Path(directory).mkdir(parents=True, exist_ok=True)

    if blob.name.endswith("/"):
      continue
    blob.download_to_filename(os.path.join(directory, file_split[-1]))

  return local_dir + model_folder_name