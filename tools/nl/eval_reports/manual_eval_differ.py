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

from absl import app
from absl import flags
import csv
from datetime import date
import gspread
from gspread_dataframe import set_with_dataframe
import pandas as pd

FLAGS = flags.FLAGS

# TODO: use only one flag from the two below and "gcs://" prefix to differentiate
# between local and GCS path.
flags.DEFINE_string('reference_sheets_url', '',
                    'Reference (old) Evaluation sheets url')
flags.DEFINE_string('latest_sheets_url', '',
                    'Latest (new) Evaluation sheets url')
flags.DEFINE_string('output_sheets_url', '',
                    'Results (output) report sheets url')

COL_QUERY = "query"
COL_RESULT = "result?"
COL_EMBARRASING = "any enmbarassing answers?"
COL_COMMENTS = "comments"

COLS = [COL_QUERY, COL_RESULT, COL_EMBARRASING, COL_COMMENTS]

WORKSHEETS = [
    "01-test-all-default queries",
    "02-Dangertest queries",
    "03-test-all-NL queries",
    "04-test-all-wide-range-queries",
    "05-SDG Queries",
    "06-UN Queries",
    "07-MSFT Queries",
]

RESULT_ORDER = {
    "THUMBS_UP": 0,
    # The two below are only used in one sheet.
    # Both the ones below imply "good result" because they
    # are looking troublesome text queries.
    "did not trigger": 0,
    "irrelevant": 0,
    "NEEDS_REORDER": 1,
    "THUMBS_DOWN": 2,
    # Two below are used interchangeably.
    "NO_RESPONSE": 3,
    "NO_RESULTS": 3,
    "NO_RESULT": 3,
    "FACEPALM": 4,

    # Empty
    "": 6,
}


def _get_sheets_data(gs, sheets_url: str, worksheet_name: str) -> pd.DataFrame:
  sheet = gs.open_by_url(sheets_url).worksheet(worksheet_name)
  df = pd.DataFrame(sheet.get_all_records()).fillna("")

  # Make sure the columns are all lower case.
  rename_cols = {}
  for c in df.columns:
    rename_cols[c] = c.lower()
  df.rename(columns=rename_cols, inplace=True)

  if "queries" in df.columns:
    df.rename(columns={"queries": "query"}, inplace=True)
  return df


def _differ(df_old: pd.DataFrame, df_new: pd.DataFrame) -> pd.DataFrame:

  assert len(df_old) == len(df_new), "Not the same worksheet lengths"

  queries = []
  potential_problems = []
  old_results = []
  new_results = []
  old_comments = []
  new_comments = []
  old_embarrasings = []
  new_embarrasings = []

  # The assumption is that the old and new worksheets have queries
  # in the same order.
  for i, row in df_old.iterrows():
    row_2 = df_new.iloc[i]

    q = row[COL_QUERY]
    if q != row_2[COL_QUERY]:
      print(f"Query {q} not present in both in the same place.")
      queries.append(q)
      potential_problems.append("NOT_SURE")
      old_results.append(row[COL_RESULT])
      new_results.append("")
      old_comments.append(row[COL_COMMENTS])
      new_comments.append("")
      old_embarrasings.append(row[COL_EMBARRASING])
      new_embarrasings.append("")
      continue

    problem = "OK"
    eval_old = RESULT_ORDER[row[COL_RESULT].strip()]
    eval_new = RESULT_ORDER[row_2[COL_RESULT].strip()]
    if eval_new > eval_old:
      problem = "REGRESSION"

    # Only a potential issue if it's a THUMBS_DOWN or worse.
    # Ignoring empty result.
    if ((eval_new >= RESULT_ORDER["THUMBS_DOWN"] and
         eval_new < RESULT_ORDER[""]) and (eval_new == eval_old)):
      problem = "EXISTING_ISSUE"

    # Keep track of embarrasing results.
    old_embarrasing = False
    if row[COL_EMBARRASING]:
      old_embarrasing = True

    new_embarrasing = False
    if row_2[COL_EMBARRASING]:
      new_embarrasing = True

    queries.append(q)
    potential_problems.append(problem)
    old_results.append(row[COL_RESULT])
    new_results.append(row_2[COL_RESULT])
    old_comments.append(row[COL_COMMENTS])
    new_comments.append(row_2[COL_COMMENTS])
    old_embarrasings.append(old_embarrasing)
    new_embarrasings.append(new_embarrasing)

  d = {
      "query": queries,
      "potential_problem": potential_problems,
      "old_result": old_results,
      "new_result": new_results,
      "old_comments": old_comments,
      "new_comments": new_comments,
      "old embarrasing result?": old_embarrasings,
      "new embarrasing result?": new_embarrasings,
  }
  return pd.DataFrame.from_dict(d)


def main(_):

  assert FLAGS.reference_sheets_url.startswith("http")
  assert FLAGS.latest_sheets_url.startswith("http")
  assert FLAGS.output_sheets_url.startswith("http")

  url_old = FLAGS.reference_sheets_url
  url_new = FLAGS.latest_sheets_url
  url_output = FLAGS.output_sheets_url

  gs = gspread.oauth()
  res_sheet = gs.open_by_url(url_output)

  for w in WORKSHEETS:
    print("=========")
    print(f"Processing worksheet: {w}")
    df_old = _get_sheets_data(gs, url_old, w)
    df_new = _get_sheets_data(gs, url_new, w)

    differ_df = _differ(df_old, df_new)

    # Create a new results worksheet
    new_worksheet_name = f"{w}_{str(date.today())}"

    print(f"Trying to write: {new_worksheet_name}")
    try:
      res_worksheet = res_sheet.add_worksheet(title=new_worksheet_name,
                                              rows=len(differ_df),
                                              cols=5 + len(differ_df.columns))
    except:
      print(f"Worksheet Already Exists (not updating!): {new_worksheet_name}")
      res_worksheet = res_sheet.worksheet(new_worksheet_name)

    # Write to the new results worksheet.
    set_with_dataframe(worksheet=res_worksheet,
                       dataframe=differ_df,
                       include_index=False,
                       include_column_header=True,
                       resize=True)
    print("=========")


if __name__ == "__main__":
  app.run(main)
