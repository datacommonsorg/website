"""
This script retrives the metadata from the data commons API and adds it to the existing NL embeddings in the following stages:
1. Import the existing NL embeddings, and separate the embeddings into batches of up to 100 Stat Vars (SVs).
2. For each batch, call the data commons API to fetch the metadata for all DCIDs in the batch
3. For each SV in the batch, extract the metadata fields in STATIC_PROPERTIES and add to a new row. Also extract any constraintProperties.
4. Create a new dataframe with the new SVs, and export it as a JSON file alyssaguo_statvars.json.

To run this script, register your data commons API key to DC_API_KEY, then run the script as normal.
"""

from typing import Dict, List

from datacommons_client.client import DataCommonsClient
import pandas as pd

# Register data commons API key here
DC_API_KEY = ""

STAT_VAR_SHEET = "tools/nl/embeddings/input/base/sheets_svs.csv"
STATIC_PROPERTIES = [
  "measuredProperty", "name", "populationType", "statType",
]
BATCH_SIZE = 100

type EmbeddingRow = Dict[str, str]

def batch_df(original_df, batch_size: int):
  """
  Splits a dataframe into batches of a given size.
  """
  batched_df_list = []
  for i in range(0, len(original_df), batch_size):
    batched_df_list.append(original_df[i:i + batch_size])
  return batched_df_list

def fetch_data(client: DataCommonsClient, dcids: List[str]):
  """
  Fetches the metadata for a list of DCIDs from the data commons API.
  """
  response = client.node.fetch(node_dcids=dcids, expression="->*")
  return response.to_dict().get("data", {})

def extract_metadata(dcid: str, sentence: str, dcid_data, needed_properties: List[str]) -> EmbeddingRow:
  """
  Extracts the metadata for a given DCID and sentence from the data commons API response.
  """
  new_row: EmbeddingRow = {
    "dcid": dcid,
    "sentence": sentence
  }

  for prop_name in needed_properties:
    # Property values are encoded as an array of nodes - take the first node as the value
    first_node = dcid_data[prop_name]["nodes"][0]

    if prop_name == "name":  # For the "name" property, the node field is "value"
      new_row[prop_name] = first_node.get("value")
    else:  # For other properties, the node field is "name"
      new_row[prop_name] = first_node.get("name")

  return extract_constraint_properties(new_row, dcid_data)

def extract_constraint_properties(new_row: EmbeddingRow, dcid_data) -> EmbeddingRow:
  """
  Extracts the constraint properties from the data commons API response and adds them to the new row.
  """
  if "constraintProperties" not in dcid_data:
    return new_row
  
  for constrained_prop_node in dcid_data["constraintProperties"]["nodes"]:
    # Use the "name" field if it exists, otherwise fall back on "dcid"
    # Some constraintProperties nodes have both "name" and "dcid", others only have "dcid"
    if "name" in constrained_prop_node:
      constrained_prop = constrained_prop_node["name"]
    else:
      constrained_prop = constrained_prop_node["dcid"]
    
    first_value_node = dcid_data[constrained_prop]["nodes"][0]
    if "name" in first_value_node:
      new_row[constrained_prop] = first_value_node.get("name")
    else:
      new_row[constrained_prop] = first_value_node.get("dcid")
  
  return new_row

def main():
  client = DataCommonsClient(api_key=DC_API_KEY)
  embeddings = pd.read_csv(STAT_VAR_SHEET)

  new_embeddings: List[EmbeddingRow] = []

  batched_list = batch_df(embeddings, BATCH_SIZE)

  for curr_batch in batched_list:
    response_data = fetch_data(client, dcids=curr_batch['dcid'].tolist())
    if not response_data:
      return
    
    dcid_sentence_tuples = zip(*curr_batch.to_dict("list").values())
    for dcid, sentence in dcid_sentence_tuples:
      dcid_data = response_data[dcid]["arcs"]

      new_row: EmbeddingRow = extract_metadata(dcid, sentence, dcid_data, STATIC_PROPERTIES)
      new_embeddings.append(new_row)

  new_embeddings_df = pd.DataFrame(new_embeddings)
  new_embeddings_df.to_json("tools/nl/nl_metadata/alyssaguo_statvars.json", orient="records", lines=True)


main()