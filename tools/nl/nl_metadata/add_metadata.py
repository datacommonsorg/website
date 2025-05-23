"""
This script retrives the metadata from the data commons API and adds it to the existing NL Stat Vars (SVs) in the following stages:
1. Import the existing NL SVs, and separate the table into batches of up to 100 SVs.
2. For each batch, call the data commons API to fetch the metadata for all DCIDs in the batch
3. For each SV in the batch, extract the common metadata fields and add to a new row. Also extract any constraintProperties.
4. Create a new dataframe with the new SVs, and export it as a JSON file alyssaguo_statvars.json.

To run this script, register your data commons API key to DC_API_KEY, then run the script using the command ./add_metadata.py
"""

from typing import Dict, List
import pandas as pd

from datacommons_client.client import DataCommonsClient
from sv_types import StatVarMetadata

# Register data commons API key here
# DC_API_KEY = ""

BATCH_SIZE = 100
STAT_VAR_SHEET = "../embeddings/input/base/sheets_svs.csv"
# These are the properties common to evey stat var
MEASURED_PROPERTY = "measuredProperty"
NAME = "name"
POPULATION_TYPE = "populationType"
STAT_TYPE = "statType"

def split_into_batches(original_df) -> List[pd.DataFrame]:
  """
  Splits a dataframe into batches of a given size.
  Ex. [1, 2, 3, 4, 5, 6] with BATCH_SIZE = 2 becomes [[1, 2], [3, 4], [5, 6]]
  """
  batched_df_list = []
  for i in range(0, len(original_df), BATCH_SIZE):
    batched_df_list.append(original_df[i:i + BATCH_SIZE])
  return batched_df_list

def get_prop_value(prop_data) -> str:
  """
  Extracts the value from the property data.
  """
  first_node = prop_data["nodes"][0]
  if "value" in first_node:
    return first_node.get("value")
  elif "name" in first_node:
    return first_node.get("name")
  else:
    return first_node.get("dcid")

def extract_metadata(new_embeddings: List[StatVarMetadata], client: DataCommonsClient, curr_batch: Dict[str, str]) -> List[StatVarMetadata]:
  """
  Extracts the metadata for a given list of DCIDs from the data commons API. 
  Adds the new metadata to the existing new_embeddings list as additional StatVarMetadata objects, and returns the updated list.
  """
  response = client.node.fetch(node_dcids=list(curr_batch.keys()), expression="->*")
  response_data = response.to_dict().get("data", {})

  if not response_data:
    raise ValueError("No data found for the given DCIDs.")  
  
  for dcid, sentence in curr_batch.items():
    new_row = StatVarMetadata(dcid=dcid, sentence=sentence) 
    dcid_data = response_data[dcid]["arcs"]

    new_row.name = get_prop_value(dcid_data[NAME])
    new_row.measuredProperty = get_prop_value(dcid_data[MEASURED_PROPERTY])
    new_row.populationType = get_prop_value(dcid_data[POPULATION_TYPE])
    new_row.statType = get_prop_value(dcid_data[STAT_TYPE])
    
    new_row = extract_constraint_properties(new_row, dcid_data)
    new_embeddings.append(new_row)
  
  return new_embeddings

def extract_constraint_properties(new_row: StatVarMetadata, dcid_data) -> StatVarMetadata:
  """
  Extracts the constraint properties from the data commons API response and adds them to the new row.
  """
  if "constraintProperties" not in dcid_data:
    return new_row
  
  constraint_dcid_to_name: Dict[str, str] = {}
  for constrained_prop_node in dcid_data["constraintProperties"]["nodes"]:
    # Use the "name" field if it exists, otherwise fall back on "dcid"
    # Some constraintProperties nodes have both "name" and "dcid", others only have "dcid"
    constraint_dcid = constrained_prop_node["dcid"]
    constraint_dcid_to_name[constraint_dcid] = constrained_prop_node["name"] if "name" in constrained_prop_node else constraint_dcid
    
  for dcid, name in constraint_dcid_to_name.items():
    new_row.constraintProperties[name] = get_prop_value(dcid_data[dcid])
  
  return new_row

def export_to_json(new_embeddings: List[StatVarMetadata]):
  """
  Exports the new embeddings to a JSON file.
  """
  flattened_embeddings: List[Dict[str, str]] = [
    {
      "dcid": embedding.dcid,
      "sentence": embedding.sentence,
      "name": embedding.name,
      "measuredProperty": embedding.measuredProperty,
      "populationType": embedding.populationType,
      "statType": embedding.statType,
      **embedding.constraintProperties
    }
    for embedding in new_embeddings
  ]
  new_embeddings_df = pd.DataFrame(flattened_embeddings)
  new_embeddings_df.to_json("./ipynb_alyssaguo_statvars.json", orient="records", lines=True)

def main():
  client = DataCommonsClient(api_key=DC_API_KEY)
  stat_var_sentences = pd.read_csv(STAT_VAR_SHEET)
  new_embeddings: List[StatVarMetadata] = []
  batched_list = split_into_batches(stat_var_sentences)

  for curr_batch in batched_list:
    curr_batch_dict = curr_batch.set_index("dcid")["sentence"].to_dict()
    new_embeddings = extract_metadata(new_embeddings, client, curr_batch=curr_batch_dict)
  
  export_to_json(new_embeddings)


main()