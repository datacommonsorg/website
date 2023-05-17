# Code from Jehangir to attach names (from KG) and descriptions
# (from DDD curated sheet) to a list SVs.
# File names are hard-coded as global constants.

import csv

import datacommons as dc
import numpy as np
import pandas as pd

_INPUT_FILE = "sv_trimmed.csv"
_DDD_TITLES_FILE = "nl_101k_svs.csv"
_PROD_FILE = "../../embeddings/sheets/dc_nl_svs_curated.csv"
_OUTPUT_FILE = "nl_14k_svs_with_descriptions.csv"


# Use DC API to get names for SVs.
def get_names(dcids):
  names = []
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
          names.append(name_list[0])
        else:
          names.append("")

    index += batch_num
  return names


# Get the 14k dcids.
df_14k_dcids = pd.read_csv(_INPUT_FILE).fillna("")

# get names and create a DataFrame with dcids and names.
if 'Name' not in df_14k_dcids.columns:
  df_14k_dcids_list = df_14k_dcids["dcid"].values
  names_14k = get_names(df_14k_dcids_list)

  df_14k_dcids = pd.DataFrame.from_dict({
      'dcid': df_14k_dcids_list,
      "Name": names_14k
  })

# Get the 101k dataframe.
df_101k = pd.read_csv(_DDD_TITLES_FILE).fillna("")
cols_to_keep = ["Name", "StatVar ID", "Chart Title"]
df_101k = df_101k[cols_to_keep]
df_101k.rename(columns={"StatVar ID": "dcid"}, inplace=True)

# Handle dupes (concats duplicated DDD descriptions/titles in a semi-colon delimited manner.)
df_101k = df_101k.groupby('dcid').agg(lambda x: ';'.join(set(x))).reset_index()

# Get the 1300 curated svs (Demo_US_SVs)
df_1300_curated = pd.read_csv(_PROD_FILE).fillna("")

print(len(df_14k_dcids))
print(len(df_101k))
print(len(df_1300_curated))

# Now, left-join (merge) them one by one with the 14k DCIDs as the left-most.
df_joined = df_14k_dcids.merge(df_1300_curated, how="left",
                               on=["dcid"]).fillna("")
# Remove the duplicated columns.
df_joined['Name_x'] = np.where(df_joined["Name_x"] != "", df_joined["Name_x"],
                               df_joined['Name_y'])
df_joined.rename(columns={"Name_x": "Name"}, inplace=True)
df_joined.drop(columns=["Name_y"], inplace=True)
print(f"After Merge 1: {len(df_joined)}")

# Lef-Joining the 101k with the left being df_joined from the previous step.
df_joined = df_joined.merge(df_101k, how="left", on=["dcid"]).fillna("")
# Remove the duplicated columns.
df_joined['Name_x'] = np.where(df_joined["Name_x"] != "", df_joined["Name_x"],
                               df_joined['Name_y'])
df_joined.rename(columns={"Name_x": "Name"}, inplace=True)
df_joined.drop(columns=["Name_y"], inplace=True)
print(f"After Merge 2: {len(df_joined)}")

# Overwrite the description. Use the DDD Chart Title as the default. If not found, use existing Description.
df_joined['Description'] = np.where(df_joined["Chart Title"] != "",
                                    df_joined["Chart Title"],
                                    df_joined['Description'])

pd.set_option('display.max_columns', None)
print(df_joined.head(10))
print(df_joined.shape)

cols_to_keep = [
    "dcid", "Name", "Description", "Override_Alternatives",
    "Curated_Alternatives"
]
df_joined = df_joined[cols_to_keep]

# No need to include SVs were there is no Name or Description or Curated_Alternative.
df_joined.drop(
    df_joined[(df_joined["Name"] == "") & (df_joined["Description"] == "") &
              (df_joined["Curated_Alternatives"] == "")].index,
    inplace=True)
df_joined.to_csv(_OUTPUT_FILE, index=False)
