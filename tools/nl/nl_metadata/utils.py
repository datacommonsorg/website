# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-20.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
Utility functions for NL metadata generation.
"""
from google.cloud import bigquery
import pandas as pd


def split_into_batches(original_df: pd.DataFrame | list,
                       batch_size: int) -> list[pd.DataFrame] | list[list]:
  """
  Splits a dataframe or list into batches of a given size.
  Ex. [1, 2, 3, 4, 5, 6] with batch_size = 2 becomes [[1, 2], [3, 4], [5, 6]]
  """
  batched_list = []
  for i in range(0, len(original_df), batch_size):
    batched_list.append(original_df[i:i + batch_size])
  return batched_list


def get_prop_value(prop_data) -> str:
  """
  Extracts the property value from the property data node from the DC API.
  For the "name" property, the value is stored in the "value" field.
  For other properties, the value is stored in the "name" field.
  If neither field exists, fall back on the "dcid" field.
  """
  first_node = prop_data["nodes"][0]
  if "value" in first_node:
    return first_node.get("value")
  elif "name" in first_node:
    return first_node.get("name")
  else:
    return first_node.get("dcid")


def extract_constraint_properties_bigquery(
    statvar_data: bigquery.table.Row) -> list[str]:
  """
  Extracts the constraint properties from the BigQuery statvar_data and returns them as a list of strings.
  The constraint properties are stored in BQ as key-value pairs in separate columns going from p1, v1, ..., p10, v10.
  """
  constraint_properties = []
  for i in range(1, 11):
    prop = getattr(statvar_data, f"p{i}", None)
    val = getattr(statvar_data, f"v{i}", None)
    if prop and val:
      constraint_properties.append(f"{prop}: {val}")
  return constraint_properties


def extract_constraint_properties_dc_api(statvar_data) -> list[str]:
  """
  Extracts the constraint properties from the data commons API response and adds them to the new row.
  """
  constraint_properties = []
  if "constraintProperties" not in statvar_data:
    return constraint_properties

  constraint_dcid_to_name: dict[str, str] = {}
  for constrained_prop_node in statvar_data["constraintProperties"]["nodes"]:
    # Use the "name" field if it exists, otherwise fall back on "dcid"
    # Some constraintProperties nodes have both "name" and "dcid", others only have "dcid"
    constraint_dcid = constrained_prop_node["dcid"]
    constraint_dcid_to_name[constraint_dcid] = constrained_prop_node[
        "name"] if "name" in constrained_prop_node else constraint_dcid

  for dcid, name in constraint_dcid_to_name.items():
    constraint_properties.append(
        f"{name}: {get_prop_value(statvar_data[dcid])}")

  return constraint_properties
