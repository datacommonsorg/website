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

import csv
import glob

from absl import app
from absl import flags
import datacommons as dc
import numpy as np
import pandas as pd

FLAGS = flags.FLAGS

flags.DEFINE_string('sv_list_file', 'input_svs.csv',
                    'File with SVs, one per line')
flags.DEFINE_string('ddd_titles_file', '/tmp/ddd_titles.csv',
                    'File with 101K curated titles from DDD')
flags.DEFINE_string('existing_svs_filepattern', '../data/*_input/*.csv',
                    'Pattern to CSVs with existing SVs')
flags.DEFINE_string('output_file', 'autogen_svs.csv', 'Output file path')


# Use DC API to get names for SVs.
def get_names(dcids):
  dcid2name = {}
  index = 0
  batch_num = 200
  while index < len(dcids):
    print(f"index={index}")
    dcids_subset = dcids[index:index + batch_num]
    name_dict = dc.get_property_values(dcids_subset, 'name')

    for d in dcids_subset:
      if d in name_dict:
        name_list = name_dict[d]
        if name_list and name_list[0]:
          dcid2name[d] = name_list[0]

    index += batch_num
  return dcid2name


def main(_):
  # Get the SV list dcids.
  with open(FLAGS.sv_list_file) as f:
    sv_list = f.read().splitlines()

  # get names and create a DataFrame with dcids and names.
  dcid2name = get_names(sv_list)

  input_df = pd.DataFrame.from_dict({
      "dcid": dcid2name.keys(),
      "Name": dcid2name.values()
  })

  # Get the DDD titles dataframe.
  ddd_df = pd.read_csv(FLAGS.ddd_titles_file).fillna("")
  cols_to_keep = ["Name", "dcid", "Chart Title"]
  ddd_df = ddd_df[cols_to_keep]
  ddd_df.rename(columns={"StatVar ID": "dcid"}, inplace=True)

  # Handle dupes (concats duplicated DDD descriptions/titles in a semi-colon delimited manner.)
  ddd_df = ddd_df.groupby('dcid').agg(lambda x: ';'.join(set(x))).reset_index()

  # Get all the existing SVs!
  existing_dfs = []
  for svf in sorted(glob.glob(FLAGS.existing_svs_filepattern)):
    # Get the 1300 curated svs (Demo_US_SVs)
    existing_dfs.append(pd.read_csv(svf).fillna(""))
    print(svf)

  existing_df = pd.concat(existing_dfs)

  print(f"Before dedupe: {len(input_df)}")

  # Remove from input_df DCIDs that already exist.
  df_joined = input_df[~input_df['dcid'].isin(existing_df['dcid'])]

  print(f"After dedupe: {len(df_joined)}")
  print(df_joined.shape)

  # Left-Joining the titles with the left being df_joined from the previous step.
  df_joined = df_joined.merge(ddd_df, how="left", on=["dcid"]).fillna("")
  # Remove the duplicated columns.
  df_joined['Name_x'] = np.where(df_joined["Name_x"] != "", df_joined["Name_x"],
                                 df_joined['Name_y'])
  df_joined.rename(columns={"Name_x": "Name"}, inplace=True)
  df_joined.drop(columns=["Name_y"], inplace=True)
  print(f"After Merge: {len(df_joined)}")
  print(df_joined.shape)

  # Overwrite the description. Use the DDD Chart Title as the default.
  df_joined['Description'] = np.where(df_joined["Chart Title"] != "",
                                      df_joined["Chart Title"], "")
  df_joined['Override_Alternatives'] = ''
  df_joined['Curated_Alternatives'] = ''

  print(f"After Description update: {len(df_joined)}")
  pd.set_option('display.max_columns', None)
  print(df_joined.shape)

  cols_to_keep = [
      "dcid", "Name", "Description", "Override_Alternatives",
      "Curated_Alternatives"
  ]
  df_joined = df_joined[cols_to_keep]

  # No need to include SVs were there is no Name or Description or Curated_Alternative.
  df_joined.drop(df_joined[(df_joined["Name"] == "") &
                           (df_joined["Description"] == "")].index,
                 inplace=True)
  df_joined.to_csv(FLAGS.output_file, index=False)


if __name__ == "__main__":
  app.run(main)
