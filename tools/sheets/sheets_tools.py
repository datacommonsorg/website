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

# TODO: Consider adding the model name to the embeddings file for downstream
# validation.

import csv
import os

from absl import app
from absl import flags
import gspread
import pandas as pd

FLAGS = flags.FLAGS
_TEMP_DIR = "/tmp"
_DEFAULT_OUTPUT_LOCAL_CSV_FILE = "sheets2csv.csv"
_DEFAULT_SHEET_NAME = "Csv2Sheet"
_NEW_SHEET_ROWS_COLS_BUFFER = 5


class Mode:
  CSV_TO_SHEET = "csv2sheet"
  SHEET_TO_CSV = "sheet2csv"


flags.DEFINE_string('local_csv_filepath',
                    '',
                    'Local csv (relative) file path',
                    short_name='l')
flags.DEFINE_string('sheets_url',
                    '',
                    'Google Sheets Url for the latest SVs',
                    short_name='s')
flags.DEFINE_string('worksheet_name',
                    '',
                    'Name of worksheet in the Google Sheets file to use',
                    short_name='w')
flags.DEFINE_enum(
    'mode',
    Mode.CSV_TO_SHEET, [Mode.CSV_TO_SHEET, Mode.SHEET_TO_CSV],
    'Mode of operation to use. Valid values: sheet2csv, csv2sheet',
    short_name='m')


# Copies a csv file to a Google Sheets worksheet
def csv2sheet(local_csv_filepath: str, sheets_url: str, worksheet_name: str):
  gs = gspread.oauth()
  worksheet = None
  if sheets_url:
    # If url to a sheet is provided, use that sheet
    sheet = gs.open_by_url(sheets_url)
    if worksheet_name:
      # If worksheet name is also provided, use that worksheet. Otherwise, need
      # to create worksheet once we know how many rows and columns to add.
      worksheet = sheet.worksheet(worksheet_name)
  else:
    # Otherwise, create new sheet and use the first worksheet, which gets
    # created with the sheet
    sheet = gs.create(worksheet_name or _DEFAULT_SHEET_NAME)
    worksheet = sheet.get_worksheet(0)

  with open(local_csv_filepath, 'r') as f:
    print(f"Copying CSV file data to Google Sheets from: {local_csv_filepath}")
    reader = csv.reader(f)
    rows = list(reader)
    if not worksheet:
      num_cols = 0
      if len(rows) > 0:
        num_cols = len(rows[0]) + _NEW_SHEET_ROWS_COLS_BUFFER
      worksheet = sheet.add_worksheet(_DEFAULT_SHEET_NAME,
                                      len(rows) + _NEW_SHEET_ROWS_COLS_BUFFER,
                                      num_cols)
    worksheet.update('A1', rows)
  print(
      f"CSV file data copied to {sheet.title}: {sheet.url} (worksheet: {worksheet.title})"
  )


# Copies a Google Sheets worksheet to a csv file.
def sheet2csv(sheets_url: str, worksheet_name: str, local_csv_filepath: str):
  gs = gspread.oauth()
  print(
      f"Downloading the latest sheets data from: {sheets_url} (worksheet: {worksheet_name})"
  )
  sheet = gs.open_by_url(sheets_url).worksheet(worksheet_name)
  # Fill empty cells with an empty string so that it reflects how the sheet looks.
  worksheet_df = pd.DataFrame(sheet.get_all_records()).fillna("")
  print(
      f"Downloaded {len(worksheet_df)} rows and {len(worksheet_df.columns)} columns."
  )
  worksheet_df.to_csv(local_csv_filepath, index=False)
  print(f"Dataframe saved locally at: {local_csv_filepath}")


def main(_):
  if FLAGS.mode == Mode.SHEET_TO_CSV:
    assert FLAGS.sheets_url and FLAGS.worksheet_name
    local_csv_filepath = FLAGS.local_csv_filepath or os.path.join(
        _TEMP_DIR, _DEFAULT_OUTPUT_LOCAL_CSV_FILE)
    sheet2csv(FLAGS.sheets_url, FLAGS.worksheet_name, local_csv_filepath)
  else:
    assert FLAGS.local_csv_filepath
    csv2sheet(FLAGS.local_csv_filepath, FLAGS.sheets_url, FLAGS.worksheet_name)


if __name__ == "__main__":
  app.run(main)
