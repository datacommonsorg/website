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

from dataclasses import dataclass
import datetime as datetime
import logging
import os

from absl import app
from absl import flags
from google.cloud import storage
import gspread
import pandas as pd
from sentence_transformers import SentenceTransformer

FLAGS = flags.FLAGS

flags.DEFINE_string('model_name', 'all-MiniLM-L6-v2', 'Model name')
flags.DEFINE_string('bucket_name', 'datcom-nl-models', 'Storage bucket')

# Specific to the spreadsheets.
COL_NAME = 'Name'
COL_DESCRIPTION = 'Final Description'  #'Description Strings'
COL_ID = "Id"
COL_ALTERNATIVES = 'Alternatives'  #'PaLM Generated Alternatives'

CSV_FILES = [
    {
        "name":
            "embeddings_us_filtered",
        "url":
            "https://docs.google.com/spreadsheets/d/1evJAt0iaPWt5pcw3B7xeAtnp_mneDkUrTL_KMyyS-RQ",
        "worksheet":
            "Combined_Filtered_US"
    },
]


def add_sv(name, sv, text2sv):
  if not name:
    return
  svs_list = []
  if name in text2sv:
    svs_list = text2sv[name]

  if sv not in svs_list:
    svs_list.append(sv)

  text2sv[name] = svs_list


def get_texts_dcids(df):
  text2sv_dict = {}
  for _, row in df.iterrows():
    name = row[COL_NAME].strip()
    sv = row[COL_ID].strip()
    add_sv(name, sv, text2sv_dict)
    if COL_DESCRIPTION in row:
      for desc in row[COL_DESCRIPTION].split(';'):
        descrip = desc.strip()
        add_sv(descrip, sv, text2sv_dict)
    if COL_ALTERNATIVES in row:
      alternatives = row[COL_ALTERNATIVES].split(';')
      # if len(alternatives) > 1:
      #   # TODO: check why the last sentence alternative is usually truncated.
      #   # Ignoring the last alternative because typically that is an incomplete sentence.
      #   alternatives = alternatives[:-1]

      for palm_alt in alternatives:
        alt = palm_alt.strip()
        add_sv(alt, sv, text2sv_dict)

  texts = sorted(list(text2sv_dict.keys()))
  dcids = [','.join(text2sv_dict[k]) for k in texts]

  return (texts, dcids)


def get_sheets_data(ctx, sheets_url, worksheet_name):
  sheet = ctx.gs.open_by_url(sheets_url).worksheet(worksheet_name)
  df = pd.DataFrame(sheet.get_all_records())
  return df


def trim_columns(df):
  cols = [COL_ID, COL_NAME]
  if COL_DESCRIPTION in df.columns:
    cols.append(COL_DESCRIPTION)
  if COL_ALTERNATIVES in df.columns:
    cols.append(COL_ALTERNATIVES)
  return df[cols]


def two_digits(number):
  number_str = str(number)
  if len(number_str) == 1:
    number_str = "0" + number_str
  return number_str


def build_embeddings(ctx, texts, dcids):
  embeddings = ctx.model.encode(texts, show_progress_bar=True)
  embeddings = pd.DataFrame(embeddings)
  embeddings['dcid'] = dcids
  embeddings['sentence'] = texts
  return embeddings


def build(ctx):
  now = datetime.datetime.now()
  for cf in CSV_FILES:
    csv_name = cf["name"]

    month_str = two_digits(now.month)
    day_str = two_digits(now.day)
    hour_str = two_digits(now.hour)
    minute_str = two_digits(now.minute)
    second_str = two_digits(now.second)

    csv_out_name_date = f"{csv_name}_{now.year}_{month_str}_{day_str}_{hour_str}_{minute_str}_{second_str}.csv"
    csv_out_path = os.path.join(ctx.tmp, csv_out_name_date)

    print("Processing: " + csv_name)
    print("\t\t getting sheet:", cf["url"])

    df = get_sheets_data(ctx, cf["url"], cf["worksheet"])
    df = df.fillna("")

    print("Updating input CSV file")
    df.to_csv(os.path.join('sheets', csv_name + '.csv'), index=False)

    print("Getting texts, dcids and embeddings.")
    df = trim_columns(df)
    (texts, dcids) = get_texts_dcids(df)

    print("Building embeddings")
    embeddings = build_embeddings(ctx, texts, dcids)

    print("Saving locally to " + csv_out_path)
    embeddings.to_csv(csv_out_path, index=False)

    # Also upload to the NL embeddings server's GCS bucket
    print("Attempting to write to GCS bucket:")
    print("\t project: datcom-204919")
    print(f"\t file: gs://{FLAGS.bucket_name}/{csv_out_name_date}")
    blob = ctx.bucket.blob(csv_out_name_date)
    blob.upload_from_filename(csv_out_path)
    print()


@dataclass
class Context:
  # gspread client
  gs: any
  # Model
  model: any
  # GCS storage bucket
  bucket: any
  # Temp dir
  tmp: str


def main(_):
  assert FLAGS.model_name and FLAGS.bucket_name

  gs = gspread.oauth()
  sc = storage.Client()
  bucket = sc.bucket(FLAGS.bucket_name)
  model = SentenceTransformer(FLAGS.model_name)

  ctx = Context(gs=gs, model=model, bucket=bucket, tmp='/tmp')

  build(ctx)


if __name__ == "__main__":
  app.run(main)
