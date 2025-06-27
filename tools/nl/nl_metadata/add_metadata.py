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
This script retrives the metadata from the data commons BigQuery table and exports it in the following stages:
1. Import the existing data commons SVs from BigQuery, and separate the table into pages of up to 3000 SVs.
2. For each page, extract the metadata and any constraintProperties to store in a list.
3. Optionally, call the Gemini API in parallel batches of up to 100 SVs each to generate approximately 5 alternative sentences per SV based on the metadata. 
   Also translate the metadata if a target language is specified.
4. Create a new dataframe with the SVs and their full metadata, and export it as a JSON file sv_complete_metadata_{target_language}_{page_number}.json.
   If the flag --saveToGCS is specified, also save to cloud storage.

To run this script, make a copy of .env.sample and register your data commons and Gemini API keys to DOTENV_FILE_PATH (./.env), then run the script using the command ./add_metadata.py
"""
import argparse
import asyncio
import json
import os

from dotenv import load_dotenv
from gemini_prompt import get_gemini_prompt
from google import genai
from google.cloud import bigquery
from google.cloud import storage
from google.genai import types
import pandas as pd
from sv_types import englishSchema
from sv_types import frenchSchema
from sv_types import spanishSchema
from sv_types import StatVarMetadata

DOTENV_FILE_PATH = "tools/nl/nl_metadata/.env"

BATCH_SIZE = 100
PAGE_SIZE = 3000
BIGQUERY_QUERY = "SELECT * FROM `datcom-store.dc_kg_latest.StatisticalVariable` WHERE name IS NOT NULL"
EXPORTED_FILE_DIR = "tools/nl/nl_metadata"
EXPORTED_FILENAME_PREFIX = "sv_complete_metadata"
GCS_PROJECT_ID = "datcom-website-dev"
GCS_BUCKET = "gmechali_csv_testing"  # TODO: Change to a dedicated bucket once we productionize
GCS_FILE_DIR = "statvar_metadata"

# These are the properties common to evey stat var
MEASURED_PROPERTY = "measuredProperty"
NAME = "name"
POPULATION_TYPE = "populationType"
STAT_TYPE = "statType"

# Constants used for Gemini API calls
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_TEMPERATURE = 1
GEMINI_TOP_P = 1
GEMINI_SEED = 0
GEMINI_MAX_OUTPUT_TOKENS = 65535
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2

load_dotenv(dotenv_path=DOTENV_FILE_PATH)
DC_API_KEY = os.getenv("DC_API_KEY")


def extract_flag() -> argparse.Namespace:
  """
  Extracts the --generateAltSentences, -language amd --saveToGCS flags from the command line arguments.
  Note that for --generateAltSentences and --saveToGCS, if these flags are present in the command line, 
  they will be set to True.
  """
  parser = argparse.ArgumentParser(description="./add_metadata.py")
  parser.add_argument(
      "--generateAltSentences",
      help=
      "Whether to generate alternative sentences for the SVs using the Gemini API.",
      action="store_true",
      default=False)
  parser.add_argument(
      "-language",
      help=
      "The language to return the metadata results in. Currently supports English, French, and Spanish.",
      choices=["English", "French", "Spanish"
              ],  # TODO: Add support for passing multiple languages at once
      type=str,
      default="English")
  parser.add_argument("--saveToGCS",
                      help="Whether to save results to GCS.",
                      action="store_true",
                      default=False)
  args = parser.parse_args()
  return args


async def get_bigquery_statvars(should_generate_alt_sentences: bool,
                                gemini_prompt: str, exported_sv_file: str,
                                should_save_to_gcs: bool) -> None:
  """
  Fetches all the SVs from BigQuery, batches them into pages of PAGE_SIZE, and processes each page into its own exported metadata file.
  """
  client = bigquery.Client()
  query_job = client.query(BIGQUERY_QUERY)
  results = query_job.result(page_size=PAGE_SIZE)

  page_number: int = 1

  for page in results.pages:
    page_svs: list[dict[str, str | list[str]]] = []
    for statvar in page:
      # Collect constraint properties
      constraint_properties = []
      for i in range(1, 11):
        prop = getattr(statvar, f"p{i}", None)
        val = getattr(statvar, f"v{i}", None)
        if prop and val:
          constraint_properties.append(f"{prop}: {val}")

      sv_entry = {
          "dcid": statvar.id,
          "measuredProperty": statvar.measured_prop,
          "name": statvar.name,
          "populationType": statvar.population_type,
          "statType": statvar.stat_type,
          "constraintProperties": constraint_properties,
      }
      page_svs.append(sv_entry)

    if should_generate_alt_sentences:
      print(f"Starting to generate alt sentences for batch number {page_number}")
      page_svs = await batch_generate_alt_sentences(page_svs, gemini_prompt)
    exported_filename = f"{exported_sv_file}_{page_number}"
    export_to_json(page_svs, exported_filename, should_save_to_gcs)
    page_number += 1


def get_language_settings(target_language: str) -> tuple[str, str]:
  exported_sv_file = f"{EXPORTED_FILENAME_PREFIX}_{target_language}"

  match target_language:
    case "French":
      language_schema = json.dumps(frenchSchema)
    case "Spanish":
      language_schema = json.dumps(spanishSchema)
    case _:
      language_schema = json.dumps(englishSchema)
  return exported_sv_file, get_gemini_prompt(target_language, language_schema)


def split_into_batches(
    original_df: pd.DataFrame | list) -> list[pd.DataFrame] | list[list]:
  """
  Splits a dataframe into batches of a given size.
  Ex. [1, 2, 3, 4, 5, 6] with BATCH_SIZE = 2 becomes [[1, 2], [3, 4], [5, 6]]
  """
  batched_df_list = []
  for i in range(0, len(original_df), BATCH_SIZE):
    batched_df_list.append(original_df[i:i + BATCH_SIZE])
  return batched_df_list


async def generate_alt_sentences(
    gemini_client: genai.Client, gemini_config: types.GenerateContentConfig,
    gemini_prompt: str, sv_metadata: list[dict[str, str | list[str]]],
    index: int) -> list[dict[str, str | list[str]]]:
  """
  Calls the Gemini API to generate alternative sentences for a list of SV metadata.
  Returns the full metadata with alt sentences as a list of dictionaries. If the API call
  fails, retry up to MAX_RETRIES times before returning the original, unmodified sv_metadata.
  """
  await asyncio.sleep(
      5 * index
  )  # Stagger each parallel Gemini API call by 5 seconds to prevent 429 errors from spiked usage.
  prompt_with_metadata = types.Part.from_text(text=(gemini_prompt +
                                                    str(sv_metadata)))

  model_input = [types.Content(role="user", parts=[prompt_with_metadata])]
  results: list[StatVarMetadata] = []
  batch_start_dcid = sv_metadata[0]["dcid"]

  for attempt in range(MAX_RETRIES):
    try:
      # Returns a GenerateContentResponse object, where the .parsed field contains the output from Gemini,
      # formatted as list[StatVarMetadata] as specified by response_schema in gemini_config
      response: types.GenerateContentResponse = await gemini_client.aio.models.generate_content(
          model=GEMINI_MODEL, contents=model_input, config=gemini_config)

      results = response.parsed
      if not results:
        raise ValueError("Gemini returned no parsed content (None or empty).")
      
      return [sv.model_dump() for sv in results]
    except ValueError as e:
      print(
          f"ValueError: {e} Attempt {attempt + 1}/{MAX_RETRIES} failed for the batch starting at DCID {batch_start_dcid}."
      )
    except Exception as e:
      if e.code == 429:
        print(
            f"Resource exhausted (HTTP 429). Attempt {attempt + 1}/{MAX_RETRIES} failed for the batch starting at DCID {batch_start_dcid}."
        )
      else:
        print(
            f"Unexpected error encountered for attempt {attempt + 1}/{MAX_RETRIES} for the batch starting at DCID {batch_start_dcid}. Error: {e} "
        )

    if attempt + 1 == MAX_RETRIES:
      print(
          f"All {MAX_RETRIES} retry attempts failed for the batch starting at DCID {batch_start_dcid}."
      )
      return sv_metadata

    print(f"Retrying after {RETRY_DELAY_SECONDS} seconds...")
    await asyncio.sleep(RETRY_DELAY_SECONDS)


async def batch_generate_alt_sentences(
    sv_metadata_list: list[dict[str, str | list[str]]],
    gemini_prompt: str) -> list[dict[str, str | list[str]]]:
  """
  Separates sv_metadata_list into batches of 100 entries, and executes multiple parallel calls to generate_alt_sentences
  using Gemini and existing SV metadata. Flattens the list of results, and returns the metadata as a list of dictionaries.
  """
  gemini_client = genai.Client(
      vertexai=True,
      project=GCS_PROJECT_ID,
      location="global",
  )
  gemini_config = types.GenerateContentConfig(
      temperature=GEMINI_TEMPERATURE,
      top_p=GEMINI_TOP_P,
      seed=GEMINI_SEED,
      max_output_tokens=GEMINI_MAX_OUTPUT_TOKENS,
      response_mime_type="application/json",
      response_schema=list[StatVarMetadata]) # TODO: Add response_schemas in French/Spanish
  batched_list: list[list[dict[str, str | list[str]]]] = split_into_batches(
      sv_metadata_list)

  parallel_tasks: list[asyncio.Task] = []
  for index, curr_batch in enumerate(batched_list):
    parallel_tasks.append(
        generate_alt_sentences(gemini_client, gemini_config, gemini_prompt,
                               curr_batch, index))

  batched_results: list[list[dict[str,
                                  str | list[str]]]] = await asyncio.gather(
                                      *parallel_tasks)

  results: list[dict[str, str | list[str]]] = []
  for batch in batched_results:
    results.extend(batch)
  return results


def export_to_json(sv_metadata_list: list[dict[str, str | list[str]]],
                   exported_filename: str, should_save_to_gcs: bool) -> None:
  """
  Exports the SV metadata list to a JSON file.
  """
  filename = f"{exported_filename}.json"
  local_file_path = f"{EXPORTED_FILE_DIR}/{filename}"
  sv_metadata_df = pd.DataFrame(sv_metadata_list)
  sv_metadata_json = sv_metadata_df.to_json(orient="records", lines=True)
  with open(local_file_path, "w") as f:
    f.write(sv_metadata_json)
  print(f"{len(sv_metadata_list)} statvars saved to {local_file_path}")

  if should_save_to_gcs:
    gcs_client = storage.Client(project=GCS_PROJECT_ID)
    bucket = gcs_client.bucket(GCS_BUCKET)
    gcs_file_path = f"{GCS_FILE_DIR}/{filename}"
    blob = bucket.blob(gcs_file_path)
    blob.upload_from_string(sv_metadata_json, content_type="application/json")

    print(
        f"{len(sv_metadata_list)} statvars saved to gs://{GCS_BUCKET}/{gcs_file_path}"
    )


async def main():
  args: argparse.Namespace = extract_flag()
  target_language = args.language
  exported_sv_file, gemini_prompt = get_language_settings(target_language)

  await get_bigquery_statvars(args.generateAltSentences, gemini_prompt,
                              exported_sv_file, args.saveToGCS)


asyncio.run(main())
