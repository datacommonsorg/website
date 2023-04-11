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
"""Build the embeddings index by concatenating various inputs."""

# TODO: This file should be renamed build_embeddings.py once it is ready to
# replace the existing build_embeddings.py file.

from dataclasses import dataclass
import datetime as datetime
import os
from typing import Any, Dict, List, Set, Tuple

from absl import app
from absl import flags
from google.cloud import storage
import gspread
import pandas as pd
from sentence_transformers import SentenceTransformer

FLAGS = flags.FLAGS

flags.DEFINE_string('model_name', 'all-MiniLM-L6-v2', 'Model name')
flags.DEFINE_string('bucket_name', 'datcom-nl-models', 'Storage bucket')

flags.DEFINE_string('local_sheets_csv_filepath', 'sheets/dc_nl_svs_curated.csv',
                    'Local Sheets csv (relative) file path')
flags.DEFINE_string(
    'sheets_url',
    'https://docs.google.com/spreadsheets/d/1-QPDWqD131LcDTZ4y_nnqllh66W010HDdows1phyneU',
    'Google Sheets Url for the latest SVs')
flags.DEFINE_string('worksheet_name', 'Demo_SVs',
                    'Worksheet name in the Google Sheets file')

flags.DEFINE_string('palm_alternatives_filepath', 'csv/palm_alternatives.csv',
                    'PaLM alternative descriptions csv (relative) file path')
flags.DEFINE_string('other_alternatives_filepath', 'csv/other_alternatives.csv',
                    'Other alternative descriptions csv (relative) file path')

flags.DEFINE_string('merged_output_filename_prefix', 'embeddings',
                    'Final merged/concatenated SVs and descriptions file.')

# Col names in the input files/sheets.
DCID_COL = 'dcid'

SHEETS_NAME_COL = 'Name'
SHEETS_DESCRIPTION_COL = 'Description'
SHEETS_ALTERNATIVES_COL = 'Curated_Alternatives'
SHEETS_OVERRIDE_COL = 'Override_Alternatives'

CSV_ALTERNATIVES_COL = 'Alternatives'

# Col names in the concatenated dataframe.
COL_ALTERNATIVES = 'sentence'

# Setting to a very high number right for now.
MAX_ALTERNATIVES_LIMIT = 50


def _add_sv(name: str, sv: str, text2sv: Dict[str, Set[str]]) -> None:
  if not name:
    return

  if name not in text2sv:
    text2sv[name] = set()
  
  text2sv[name].add(sv)


def _get_texts_dcids(df: pd.DataFrame) -> Tuple[List[str], List[str]]:
  """Extract an ordered list of alternatives (texts) and the corresponding StatVar dcids."""
  text2sv_dict = {}
  for _, row in df.iterrows():
    sv = row[DCID_COL].strip()

    # All alternative sentences are retrieved from COL_ALTERNATIVES, which
    # are expected to be delimited by ";" (semi-colon).
    if COL_ALTERNATIVES in row:
      alternatives = row[COL_ALTERNATIVES].split(';')

      for alt in alternatives:
        alt = alt.strip()
        _add_sv(alt, sv, text2sv_dict)

  texts = sorted(list(text2sv_dict.keys()))
  dcids = [','.join(sorted(text2sv_dict[k])) for k in texts]
  
  return (texts, dcids)


def _trim_columns(df: pd.DataFrame) -> pd.DataFrame:
  cols = [DCID_COL, COL_ALTERNATIVES]
  return df[cols]


def _two_digits(number: int) -> str:
  return str(number).zfill(2)


def _make_gcs_embeddings_filename(filename_prefix: str) -> str:
  now = datetime.datetime.now()

  month_str = _two_digits(now.month)
  day_str = _two_digits(now.day)
  hour_str = _two_digits(now.hour)
  minute_str = _two_digits(now.minute)
  second_str = _two_digits(now.second)

  return f"{filename_prefix}_curated_merged_alternatives_{now.year}_{month_str}_{day_str}_{hour_str}_{minute_str}_{second_str}.csv"


def _merge_dataframes(df_1: pd.DataFrame, df_2: pd.DataFrame, concat_delimited=";") -> pd.DataFrame:
  # In case there is a column (besides DCID_COL) which is common, the merged copy
  # will contain two columns (one with a postfix _x and one with a postfix _y.
  # Concatenate the two to produce a final version.
  df_1 = df_1.merge(df_2, how='left', on=DCID_COL, suffixes=("_x", "_y")).fillna("")
  
  # Determine the columns which were common.
  common_cols = set()
  for col in df_1.columns:
    if col.endswith("_x") or col.endswith("_y"):
      common_cols.add(col.replace("_x", "").replace("_y", ""))
  
  # Replace the common columns with their concatenation.
  for col in common_cols:
    df_1[col] = df_1[f"{col}_x"].str.cat(df_1[f"{col}_y"], sep =";")
    df_1[col] = df_1[col].replace(to_replace ="^;", value = "", regex = True)
    df_1 = df_1.drop(columns=[f"{col}_x", f"{col}_y"])

  return df_1


def _concat_alternatives(alternatives: List[str],
                         max_alternatives,
                         delimiter=";") -> str:
  alts = set(alternatives[0:max_alternatives])
  return f"{delimiter}".join(alts)


def _split_alt_string(alt_string: str) -> List[str]:
  alts = []
  for alt in alt_string.strip().split(";"):
    if alt:
      alts.append(alt)
  return alts


def _build_embeddings(ctx, texts: List[str], dcids: List[str]) -> pd.DataFrame:
  assert len(texts) == len(dcids)

  embeddings = ctx.model.encode(texts, show_progress_bar=True)
  embeddings = pd.DataFrame(embeddings)
  embeddings[DCID_COL] = dcids
  embeddings[COL_ALTERNATIVES] = texts
  return embeddings


def get_sheets_data(ctx, sheets_url: str, worksheet_name: str) -> pd.DataFrame:
  sheet = ctx.gs.open_by_url(sheets_url).worksheet(worksheet_name)
  df = pd.DataFrame(sheet.get_all_records()).fillna("")
  return df


def get_local_alternatives(local_filename: str,
                           local_col_names: List[str]) -> pd.DataFrame:
  df = pd.read_csv(local_filename).fillna("")
  df = df[local_col_names]
  return df


def get_embeddings(ctx, df_svs: pd.DataFrame,
                   local_merged_filepath: str) -> pd.DataFrame:
  print(f"Concatenate all alternative sentences for descriptions.")
  alternate_descriptions = []
  for _, row in df_svs.iterrows():
    alternatives = []
    if row[SHEETS_OVERRIDE_COL]:
      # Override takes precendence over everything else.
      alternatives += _split_alt_string(row[SHEETS_OVERRIDE_COL])
    else:
      for col_name in [
          SHEETS_NAME_COL,
          SHEETS_DESCRIPTION_COL,
          SHEETS_ALTERNATIVES_COL,
          CSV_ALTERNATIVES_COL,
      ]:
        # In order of preference, traverse the various alternative descriptions.
        alternatives += _split_alt_string(row[col_name])

    alt_str = _concat_alternatives(alternatives, MAX_ALTERNATIVES_LIMIT)
    alternate_descriptions.append(alt_str)

  assert len(df_svs) == len(alternate_descriptions)
  df_svs[COL_ALTERNATIVES] = alternate_descriptions

  # Write to local_merged_filepath.
  print(
      f"Writing the concatenated dataframe after merging alternates to local file: {local_merged_filepath}"
  )
  df_svs[[DCID_COL, COL_ALTERNATIVES]].to_csv(local_merged_filepath, index=False)

  # Build embeddings.
  print("Getting texts, dcids and embeddings.")
  df_svs = _trim_columns(df_svs)
  (texts, dcids) = _get_texts_dcids(df_svs)

  print("Building embeddings")
  return _build_embeddings(ctx, texts, dcids)


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


def main(_):
  assert FLAGS.model_name and FLAGS.bucket_name and FLAGS.local_sheets_csv_filepath and FLAGS.sheets_url and FLAGS.worksheet_name

  assert os.path.exists(os.path.join('sheets'))
  assert os.path.exists(os.path.join('csv'))

  local_merged_filepath = os.path.join(
      'csv', FLAGS.merged_output_filename_prefix + "_input_sv_descriptions.csv")

  gs = gspread.oauth()
  sc = storage.Client()
  bucket = sc.bucket(FLAGS.bucket_name)
  model = SentenceTransformer(FLAGS.model_name)

  ctx = Context(gs=gs, model=model, bucket=bucket, tmp='/tmp')

  gcs_embeddings_filename = _make_gcs_embeddings_filename(
      FLAGS.merged_output_filename_prefix)
  gcs_tmp_out_path = os.path.join(ctx.tmp, gcs_embeddings_filename)

  # First download the latest file from sheets.
  print(
      f"Downloading the latest sheets data from: {FLAGS.sheets_url} (worksheet: {FLAGS.worksheet_name})"
  )
  df_svs = get_sheets_data(ctx, FLAGS.sheets_url, FLAGS.worksheet_name)
  print(f"Downloaded {len(df_svs)} rows and {len(df_svs.columns)} columns.")

  # Write this downloaded file to local.
  print(
      f"Writing the downloaded dataframe to local at: {FLAGS.local_sheets_csv_filepath}")
  df_svs.to_csv(FLAGS.local_sheets_csv_filepath, index=False)
  
  # Get other alternatives and add to the dataframe.
  df_other = get_local_alternatives(FLAGS.other_alternatives_filepath,
                                    [DCID_COL, CSV_ALTERNATIVES_COL])
  df_svs = _merge_dataframes(df_svs, df_other)
                             
  # Get the PaLM-based alternatives and add to the dataframe.
  df_palm = get_local_alternatives(FLAGS.palm_alternatives_filepath,
                                   [DCID_COL, CSV_ALTERNATIVES_COL])
  df_svs = _merge_dataframes(df_svs, df_palm)

  embeddings_df = get_embeddings(ctx, df_svs, local_merged_filepath)
  print(f"Saving locally to {gcs_tmp_out_path}")
  embeddings_df.to_csv(gcs_tmp_out_path, index=False)

  # Finally, upload to the NL embeddings server's GCS bucket
  print("Attempting to write to GCS")
  print(f"\t GCS Path: gs://{FLAGS.bucket_name}/{gcs_embeddings_filename}")
  blob = ctx.bucket.blob(gcs_embeddings_filename)
  blob.upload_from_filename(gcs_tmp_out_path)
  print("Done uploading to gcs.")
  print(f"\t Embeddings Filename: {gcs_embeddings_filename}")
  print("\nNOTE: Please update model.yaml with the Embeddings Filename")


if __name__ == "__main__":
  app.run(main)
