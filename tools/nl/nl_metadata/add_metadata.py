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
4. Optionally, call the Gemini API in parallel batches to generate approximately 5 alternative sentences per SV based on the metadata. Also translate the metadata if a target language is specified.
5. Create a new dataframe with the new SVs, and export it as a JSON file alyssaguo_statvars_{target_language}.json.

To run this script, make a copy of .env.sample and register your data commons and Gemini API keys to DOTENV_FILE_PATH (./.env), then run the script using the command ./add_metadata.py
"""
import argparse
import asyncio
from dotenv import load_dotenv
import json
import os
import pandas as pd
from typing import Dict, List

from datacommons_client.client import DataCommonsClient
from google import genai
from google.genai import types
from gemini_prompt import get_gemini_prompt
from sv_types import englishSchema, frenchSchema, spanishSchema, StatVarMetadata, SVMetadataDict

DOTENV_FILE_PATH = "tools/nl/nl_metadata/.env"

BATCH_SIZE = 100
STAT_VAR_SHEET = "tools/nl/embeddings/input/base/sheets_svs.csv"
EXPORTED_FILE_DIR = "tools/nl/nl_metadata/"
EXPORTED_FILENAME_PREFIX = "sv_complete_metadata"

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
MAX_RETRIES = 5
RETRY_DELAY_SECONDS = 2

load_dotenv(dotenv_path=DOTENV_FILE_PATH)
DC_API_KEY = os.getenv("DC_API_KEY")


def extract_flag() -> argparse.Namespace:
  """
  Extracts the -generateAltSentences and -language flags from the command line arguments.
  """
  parser = argparse.ArgumentParser(description="./add_metadata.py")
  parser.add_argument(
      "-generateAltSentences",
      help=
      "Whether to generate alternative sentences for the SVs using the Gemini API.",
      type=bool,
      default=False)
  parser.add_argument(
    "-language",
    help="The language to return the metadata results in. Currently supports English, French, and Spanish.",
    choices=["English", "French", "Spanish"], # TODO: Add support for more languages
    type=str,
    default="English"
  )
  args = parser.parse_args()
  return args

def get_language_settings(target_language: str) -> str:
  exported_sv_file = f"{EXPORTED_FILE_DIR}{EXPORTED_FILENAME_PREFIX}_{target_language}.json"

  match target_language:
    case "French":
      language_schema = json.dumps(frenchSchema)
    case "Spanish":
      language_schema = json.dumps(spanishSchema)
    case _:
      language_schema = json.dumps(englishSchema)
  
  return exported_sv_file, get_gemini_prompt(target_language, language_schema)

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
    sv_metadata_list: List[SVMetadataDict]) -> List[SVMetadataDict]:
  """
  Extracts the metadata for a list of DCIDs (given as the keys in curr_batch) from the data commons API. 
  Adds the new metadata to the existing list sv_metadata_list, and returns the list.
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
    sv_metadata_list.append(new_row.__dict__)

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
    new_row.constraintProperties.append(f"{name}: {get_prop_value(dcid_data[dcid])}")

  return new_row


def create_sv_metadata() -> List[SVMetadataDict]:
  """
  Creates SV metadata by taking the existing SV sheet, and calling the relevant helper functions to add metadata for the SVs.
  """
  client = DataCommonsClient(api_key=DC_API_KEY)
  stat_var_sentences = pd.read_csv(STAT_VAR_SHEET)
  sv_metadata_list: List[SVMetadataDict] = []
  batched_list = split_into_batches(stat_var_sentences)

  for curr_batch in batched_list:
    dcid_to_sentence: Dict[str, str] = curr_batch.set_index(
        "dcid")["sentence"].to_dict()
    sv_metadata_list: List[SVMetadataDict] = extract_metadata(
        client, dcid_to_sentence, sv_metadata_list)

  return sv_metadata_list


async def generate_alt_sentences(
    gemini_client: genai.Client, gemini_config: types.GenerateContentConfig,
    gemini_prompt: str, sv_metadata: List[SVMetadataDict]) -> List[SVMetadataDict]:
  """
  Calls the Gemini API to generate alternative sentences for a list of SV metadata.
  Returns the alt sentences as a list of dictionaries.
  """
  prompt_with_metadata = types.Part.from_text(text=(gemini_prompt +
                                                    str(sv_metadata)))

  model_input = [types.Content(role="user", parts=[prompt_with_metadata])]
  results: List[SVMetadataDict] = []

  for attempt in range(MAX_RETRIES):
    try:
      # Returns a GenerateContentResponse object, where the .text field contains the output from Gemini
      # Output is formatted as a JSON string representing a Dict mapping DCID to a list of alt sentences
      response: types.GenerateContentResponse = await gemini_client.aio.models.generate_content(
          model=GEMINI_MODEL, contents=model_input, config=gemini_config)

      results = json.loads(response.text, strict=False)
      return results
    except json.JSONDecodeError as e:
      print(
          f"Attempt {attempt + 1} failed. Exception occurred while generating alt sentences for the batch starting at DCID {sv_metadata[0]["dcid"]}. Error decoding Gemini response into JSON: {e}"
      )
      if attempt + 1 == MAX_RETRIES:
        print(
            f"All {MAX_RETRIES} retry attempts failed for the batch starting at DCID {sv_metadata[0]["dcid"]}."
        )
        break

      await asyncio.sleep(RETRY_DELAY_SECONDS)
  return results # Return an empty list if all attempts fail


async def batch_generate_alt_sentences(
    sv_metadata_list: List[SVMetadataDict], gemini_prompt: str) -> Dict[str, List[str]]:
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
  batched_list: List[List[SVMetadataDict]] = split_into_batches(
      sv_metadata_list)

  parallel_tasks: List[asyncio.Task] = []
  for curr_batch in batched_list:
    parallel_tasks.append(
        generate_alt_sentences(gemini_client, gemini_config, gemini_prompt, curr_batch))

  batched_results: List[List[SVMetadataDict]] = await asyncio.gather(
      *parallel_tasks)

  results: List[SVMetadataDict] = []
  for batch in batched_results:
    results.extend(batch)
  return results

def export_to_json(sv_metadata_list: List[SVMetadataDict], exported_sv_file: str) -> None:
  """
  Exports the SV metadata list to a JSON file.
  """
  sv_metadata_df = pd.DataFrame(sv_metadata_list)
  sv_metadata_df.to_json(exported_sv_file, orient="records", lines=True)


async def main():
  args: argparse.Namespace = extract_flag()
  exported_sv_file = f"{EXPORTED_FILE_DIR}{EXPORTED_FILENAME_PREFIX}.json"

  sv_metadata_list: List[SVMetadataDict] = create_sv_metadata()
  if args.generateAltSentences:
    target_language = args.language
    exported_sv_file, gemini_prompt = get_language_settings(target_language)
    sv_metadata_list = await batch_generate_alt_sentences(sv_metadata_list, gemini_prompt)
  export_to_json(sv_metadata_list, exported_sv_file)


asyncio.run(main())
