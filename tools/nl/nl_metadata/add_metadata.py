# Copyright 2025 Google LLC
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
"""
This script retrives the metadata from the data commons API and adds it to the existing NL Stat Vars (SVs) in the following stages:
1. Import the existing NL SVs, and separate the table into batches of up to 100 SVs.
2. For each batch, call the data commons API to fetch the metadata for all DCIDs in the batch
3. For each SV in the batch, extract the common metadata fields and add to a new row. Also extract any constraintProperties.
4. Optionally, call the Gemini API to generate approximately 5 alternative sentences per SV based on the metadata.
5. Create a new dataframe with the new SVs, and export it as a JSON file alyssaguo_statvars.json.

To run this script, register your data commons API key to DC_API_KEY in DOTENV_FILE_PATH (.env_nl), then run the script using the command ./add_metadata.py
"""
import argparse
import json
import os
from typing import Dict, List

from datacommons_client.client import DataCommonsClient
from dotenv import load_dotenv
from google import genai
from google.genai import types
import pandas as pd
from sv_constants import GEMINI_PROMPT
from sv_types import StatVarMetadata

DOTENV_FILE_PATH = ".env_nl/.env"

BATCH_SIZE = 100
STAT_VAR_SHEET = "tools/nl/embeddings/input/base/sheets_svs.csv"
EXPORTED_SV_FILE = "tools/nl/nl_metadata/alyssaguo_statvars.json"

# These are the properties common to evey stat var
MEASURED_PROPERTY = "measuredProperty"
NAME = "name"
POPULATION_TYPE = "populationType"
STAT_TYPE = "statType"

# Constants used for Gemini API calls
GEMINI_MODEL = "gemini-2.5-flash-preview-05-20"
GEMINI_TEMPERATURE = 1
GEMINI_TOP_P = 1
GEMINI_SEED = 0
GEMINI_MAX_OUTPUT_TOKENS = 65535

load_dotenv(dotenv_path=DOTENV_FILE_PATH)
DC_API_KEY = os.getenv("DC_API_KEY")


def split_into_batches(original_df: pd.DataFrame) -> List[pd.DataFrame]:
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
  Extracts the property value from the property data.
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


def extract_metadata(client: DataCommonsClient,
                     curr_batch: Dict[str, str]) -> List[StatVarMetadata]:
  """
  Extracts the metadata for a list of DCIDs (given as the keys in curr_batch) from the data commons API. 
  Adds the new metadata to a new list of StatVarMetadata objects, and returns the list.
  """
  new_batch: List[StatVarMetadata] = []
  response = client.node.fetch(node_dcids=list(curr_batch.keys()),
                               expression="->*")
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
    new_batch.append(new_row)

  return new_batch


def extract_constraint_properties(new_row: StatVarMetadata,
                                  dcid_data) -> StatVarMetadata:
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
    constraint_dcid_to_name[constraint_dcid] = constrained_prop_node[
        "name"] if "name" in constrained_prop_node else constraint_dcid

  for dcid, name in constraint_dcid_to_name.items():
    new_row.constraintProperties[name] = get_prop_value(dcid_data[dcid])

  return new_row


def generate_alt_sentences(
    gemini_client: genai.Client, gemini_config: types.GenerateContentConfig,
    sv_metadata_list: List[StatVarMetadata],
    metadata_dicts: List[Dict[str, str]]) -> List[Dict[str, str]]:
  """
  Calls the Gemini API to generate alternative sentences for a batch of SV metadata.
  Appends the new metadata (including altSentences) to the existing sv_metadata_list and returns it.
  """
  prompt_with_metadata = types.Part.from_text(text=(GEMINI_PROMPT +
                                                    str(metadata_dicts)))

  model_input = [types.Content(role="user", parts=[prompt_with_metadata])]

  try:
    response = gemini_client.models.generate_content(model=GEMINI_MODEL,
                                                     contents=model_input,
                                                     config=gemini_config)

    new_metadata_list = json.loads(response.text, strict=False)
    sv_metadata_list.extend(new_metadata_list)
  except json.JSONDecodeError as e:
    print(
        f"Exception occurred while getting alt sentences for the batch starting at SV row number {len(sv_metadata_list)}. Error decoding Gemini response into JSON: {e}"
    )

  return sv_metadata_list

def flatten_metadata(
    sv_metadata_list: List[Dict[str, str]],
    curr_batch_metadata: List[StatVarMetadata],
    alt_sentences: Dict[str, List[str]] | None) -> List[Dict[str, str]]:
  """
  Flattens the StatVarMetadata so that constraintProperties become top-level entries, and adds the altSentences if provided.
  """
  for metadata in curr_batch_metadata:
    flattened_metadata: Dict[str, str] = {
        "dcid": metadata.dcid,
        "sentence": metadata.sentence,
        "name": metadata.name,
        "measuredProperty": metadata.measuredProperty,
        "populationType": metadata.populationType,
        "statType": metadata.statType,
        **metadata.constraintProperties
    }
    if alt_sentences and metadata.dcid in alt_sentences:
      flattened_metadata["altSentences"] = alt_sentences[metadata.dcid]
    sv_metadata_list.append(flattened_metadata)
  
  return sv_metadata_list

def create_sv_metadata(generateAltSentences: bool) -> None:
  """
  Creates SV metadata JSONL file by taking the existing SV sheet, and calling the relevant helper functions to add metadata for the SVs.
  """
  client = DataCommonsClient(api_key=DC_API_KEY)
  gemini_client = genai.Client(
      vertexai=True,
      project="datcom-website-dev",
      location="global",
  )
  gemini_config = types.GenerateContentConfig(
      temperature = GEMINI_TEMPERATURE,
      top_p = GEMINI_TOP_P,
      seed = GEMINI_SEED,
      max_output_tokens = GEMINI_MAX_OUTPUT_TOKENS,
      response_mime_type="application/json",
  )
  stat_var_sentences = pd.read_csv(STAT_VAR_SHEET)
  sv_metadata_list: List[Dict[str, str]] = []
  batched_list = split_into_batches(stat_var_sentences)

  for curr_batch in batched_list:
    curr_batch_dict: Dict[str, str] = curr_batch.set_index(
        "dcid")["sentence"].to_dict()
    curr_batch_metadata: List[StatVarMetadata] = extract_metadata(
        client, curr_batch=curr_batch_dict)
    alt_sentences: Dict[str, List[str]] | None = None
    if generateAltSentences:
      alt_sentences = generate_alt_sentences(gemini_client, gemini_config,
                                             curr_batch_metadata)
    sv_metadata_list = flatten_metadata(
        sv_metadata_list, curr_batch_metadata, alt_sentences)

  sv_metadata_df = pd.DataFrame(sv_metadata_list)
  sv_metadata_df.to_json(EXPORTED_SV_FILE, orient="records", lines=True)

parser = argparse.ArgumentParser("./add_metadata.py")
parser.add_argument("-generateAltSentences", help="Whether to generate alternative sentences for the SVs using the Gemini API.",
                    type=bool, default=False)
args = parser.parse_args()
create_sv_metadata(args.generateAltSentences)
