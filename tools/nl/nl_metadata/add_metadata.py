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
4. Optionally, call the Gemini API in parallel batches to generate approximately 5 alternative sentences per SV based on the metadata.
5. Create a new dataframe with the new SVs, and export it as a JSON file alyssaguo_statvars.json.

To run this script, make a copy of .env.sample and register your data commons and Gemini API keys to DOTENV_FILE_PATH (./.env), then run the script using the command ./add_metadata.py
To run this script, make a copy of .env.sample and register your data commons and Gemini API keys to DOTENV_FILE_PATH (./.env), then run the script using the command ./add_metadata.py
"""
import argparse
import asyncio
import json
import os
from typing import Dict, List

from datacommons_client.client import DataCommonsClient
from dotenv import load_dotenv
from google import genai
from google.genai import types
from dotenv import load_dotenv
from google import genai
from google.genai import types
import pandas as pd
from sv_constants import GEMINI_PROMPT
from sv_constants import GEMINI_PROMPT
from sv_types import StatVarMetadata

DOTENV_FILE_PATH = "tools/nl/nl_metadata/.env"
DOTENV_FILE_PATH = "tools/nl/nl_metadata/.env"

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


def extract_flag() -> argparse.Namespace:
  """
  Extracts the -generateAltSentences flag from the command line arguments.
  """
  parser = argparse.ArgumentParser(description="./add_metadata.py")
  parser.add_argument(
      "-generateAltSentences",
      help=
      "Whether to generate alternative sentences for the SVs using the Gemini API.",
      type=bool,
      default=False)
  args = parser.parse_args()
  return args


def split_into_batches(
    original_df: pd.DataFrame | List) -> List[pd.DataFrame] | List[List]:
# Constants used for Gemini API calls
GEMINI_MODEL = "gemini-2.5-flash-preview-05-20"
GEMINI_TEMPERATURE = 1
GEMINI_TOP_P = 1
GEMINI_SEED = 0
GEMINI_MAX_OUTPUT_TOKENS = 65535

load_dotenv(dotenv_path=DOTENV_FILE_PATH)
DC_API_KEY = os.getenv("DC_API_KEY")


def extract_flag() -> argparse.Namespace:
  """
  Extracts the -generateAltSentences flag from the command line arguments.
  """
  parser = argparse.ArgumentParser(description="./add_metadata.py")
  parser.add_argument(
      "-generateAltSentences",
      help=
      "Whether to generate alternative sentences for the SVs using the Gemini API.",
      type=bool,
      default=False)
  args = parser.parse_args()
  return args


def split_into_batches(
    original_df: pd.DataFrame | List) -> List[pd.DataFrame] | List[List]:
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


def extract_metadata(
    client: DataCommonsClient, curr_batch: Dict[str, str],
    sv_metadata_list: List[StatVarMetadata]) -> List[StatVarMetadata]:
def extract_metadata(
    client: DataCommonsClient, curr_batch: Dict[str, str],
    sv_metadata_list: List[StatVarMetadata]) -> List[StatVarMetadata]:
  """
  Extracts the metadata for a list of DCIDs (given as the keys in curr_batch) from the data commons API. 
  Adds the new metadata to a new list of StatVarMetadata objects, and returns the list.
  Adds the new metadata to a new list of StatVarMetadata objects, and returns the list.
  """
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
    sv_metadata_list.append(new_row)

  return sv_metadata_list


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


def create_sv_metadata() -> List[StatVarMetadata]:
def create_sv_metadata() -> List[StatVarMetadata]:
  """
  Creates SV metadata by taking the existing SV sheet, and calling the relevant helper functions to add metadata for the SVs.
  """
  client = DataCommonsClient(api_key=DC_API_KEY)
  stat_var_sentences = pd.read_csv(STAT_VAR_SHEET)
  sv_metadata_list: List[StatVarMetadata] = []
  batched_list = split_into_batches(stat_var_sentences)

  for curr_batch in batched_list:
    dcid_to_sentence: Dict[str, str] = curr_batch.set_index(
        "dcid")["sentence"].to_dict()
    sv_metadata_list: List[StatVarMetadata] = extract_metadata(
        client, dcid_to_sentence, sv_metadata_list)

  return sv_metadata_list


async def generate_alt_sentences(
    gemini_client: genai.Client, gemini_config: types.GenerateContentConfig,
    sv_metadata: List[StatVarMetadata]) -> Dict[str, List[str]]:
  """
  Calls the Gemini API to generate alternative sentences for a list of SV metadata.
  Returns the alt sentences as a dictionary mapping DCID to the list of sentences.
  """
  prompt_with_metadata = types.Part.from_text(text=(GEMINI_PROMPT +
                                                    str(sv_metadata)))

  model_input = [types.Content(role="user", parts=[prompt_with_metadata])]
  alt_sentences: Dict[str, List[str]] = {}

  try:
    # Returns a GenerateContentResponse object, where the .text field contains the output from Gemini
    # Output is formatted as a JSON string representing a Dict mapping DCID to a list of alt sentences
    response: types.GenerateContentResponse = await gemini_client.aio.models.generate_content(
        model=GEMINI_MODEL, contents=model_input, config=gemini_config)

    alt_sentences = json.loads(response.text, strict=False)
  except json.JSONDecodeError as e:
    print(
        f"Exception occurred while generating alt sentences for the batch starting at DCID {sv_metadata[0].dcid}. Error decoding Gemini response into JSON: {e}"
    )

  return alt_sentences


async def batch_generate_alt_sentences(
    sv_metadata_list: List[StatVarMetadata]) -> Dict[str, List[str]]:
  """
  Separates sv_metadata_list into batches of 100 entries, and executes multiple parallel calls to generate_alt_sentences
  using Gemini and existing SV metadata. Flattens the list of results, and returns the generated altSentences
  as a dictionary mapping DCID to the list of altSentences.
  """
  gemini_client = genai.Client(
      vertexai=True,
      project="datcom-website-dev",
      location="global",
  )
  gemini_config = types.GenerateContentConfig(
      temperature=GEMINI_TEMPERATURE,
      top_p=GEMINI_TOP_P,
      seed=GEMINI_SEED,
      max_output_tokens=GEMINI_MAX_OUTPUT_TOKENS,
      response_mime_type="application/json",
  )
  batched_list: List[List[StatVarMetadata]] = split_into_batches(
      sv_metadata_list)

  tasks_to_parallelize: List[asyncio.Task] = []
  for curr_batch in batched_list:
    tasks_to_parallelize.append(
        generate_alt_sentences(gemini_client, gemini_config, curr_batch))

  batched_alt_sentences: List[Dict[str, List[str]]] = await asyncio.gather(
      *tasks_to_parallelize)

  dcid_to_alt_sentences: Dict[str, List[str]] = {}
  for alt_sentence_batch in batched_alt_sentences:
    dcid_to_alt_sentences.update(alt_sentence_batch)
  return dcid_to_alt_sentences


async def create_generated_sentences(
    sv_metadata_list: List[StatVarMetadata]) -> List[StatVarMetadata]:
  """
  Populates generatedSentences for each SV by taking the SV metadata list, and calling the relevant helper function to generate altSentences using Gemini.
  """
  metadata_with_sentences: List[StatVarMetadata] = []
  dcid_to_alt_sentences: Dict[
      str, List[str]] = await batch_generate_alt_sentences(sv_metadata_list)

  for metadata in sv_metadata_list:
    if metadata.dcid in dcid_to_alt_sentences:
      metadata.generatedSentences = dcid_to_alt_sentences[metadata.dcid]
    else:
      print(
          f"No alternative sentences generated for DCID {metadata.dcid}. Falling back to empty list."
      )
      metadata.generatedSentences = []
    metadata_with_sentences.append(metadata)

  return metadata_with_sentences


def export_to_json(sv_metadata_list: List[StatVarMetadata]) -> None:
  """
  Exports the SV metadata list to a JSON file.
  """
  flattened_metadata: Dict[str, str | List[str]] = [
      {
          "dcid":
              metadata.dcid,
          "sentence":
              metadata.sentence,
          "generatedSentences":
              metadata.generatedSentences,
          "name":
              metadata.name,
          "measuredProperty":
              metadata.measuredProperty,
          "populationType":
              metadata.populationType,
          "statType":
              metadata.statType,
          "constraintProperties": [
              f"{key}: {value}"
              for key, value in metadata.constraintProperties.items()
          ]
      }
      for metadata in sv_metadata_list
  ]
  sv_metadata_df = pd.DataFrame(flattened_metadata)
  sv_metadata_df.to_json(EXPORTED_SV_FILE, orient="records", lines=True)


async def main():
  args: argparse.Namespace = extract_flag()
  sv_metadata_list = create_sv_metadata()
  if args.generateAltSentences:
    sv_metadata_list = await create_generated_sentences(sv_metadata_list)
  export_to_json(sv_metadata_list)


asyncio.run(main())
