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
This script retrives the metadata from the data commons API or BigQuery (BQ) table and exports it in the following stages:
1. Import the existing data commons SVs from either the existing NL SVs or BigQuery. 
   If importing from BQ, separate the table into {num_partitions} and only process the SVs from {curr_partition} as specified by flag arguments, returning the data in pages of up to 3000 SVs.
2. For each page, extract the metadata (either from DC API or BQ) and any constraintProperties to store in a list. 
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

from datacommons_client.client import DataCommonsClient
from dotenv import load_dotenv
from gemini_prompt import get_gemini_prompt
from google.api_core.page_iterator import Iterator
from google.api_core.page_iterator import Page
from google.cloud import bigquery
from google.cloud import storage
from google.genai import types
import google.genai as genai
import pandas as pd
from sv_types import englishSchema
from sv_types import frenchSchema
from sv_types import spanishSchema
from sv_types import StatVarMetadata

DOTENV_FILE_PATH = "tools/nl/nl_metadata/.env"

BATCH_SIZE = 100
PAGE_SIZE = 3000
# BigQuery query to fetch the SVs. Excludes experimental SVs because they are not present in the prod data commons KG.
# Also excludes SVs with null names, as these don't have enough metadata for Gemini to generate alt sentences.
BIGQUERY_QUERY_BASE = "SELECT * FROM `datcom-store.dc_kg_latest.StatisticalVariable` WHERE name IS NOT NULL AND prov_id != \"dc/base/ExperimentalStatVars\""
STAT_VAR_SHEET = "tools/nl/embeddings/input/base/sheets_svs.csv"
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
  Defines and extracts the script flags from the command line arguments.
  Note that for boolean flags (--generateAltSentences, --saveToGCS, and --useBigQuery), if these flags are present in the command line, 
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
      "--language",
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
  parser.add_argument(
      "--useBigQuery",
      help=
      "Whether to pull all 700,000+ statvars from BigQuery. If false/unspecified, only statvars used for NL will be used.",
      action="store_true",
      default=False)
  parser.add_argument(
      "--maxStatVars",
      help=
      "The maximum number of statvars to process from BigQuery. If specified, will limit the number of statvars processed to this number.",
      type=int,
      default=None)
  parser.add_argument(
      "--gcsFolder",
      help=
      "The folder in the GCS bucket to save the results to. Defaults to 'statvar_metadata'.",
      type=str,
      default=GCS_FILE_DIR)
  parser.add_argument(
      "--totalJobs",
      help=
      "The total number of jobs to run in parallel, each using a different Gemini API key. Only used if --useBigQuery is specified.",
      type=int,
      default=1)
  parser.add_argument(
      "--currJob",
      help=
      "The current job number (0-indexed) to run. Should be within the range [0, totalJobs). Only used if --useBigQuery is specified.",
      type=int,
      default=0)
  args = parser.parse_args()
  return args


def verify_args(args: argparse.Namespace) -> None:
  """
  Verifies the command line arguments passed to the script.
  Raises an error if any of the arguments are invalid.
  """
  if args.totalJobs <= 0:
    raise ValueError("Total number of jobs must be greater than 0.")
  if args.currJob < 0 or args.currJob >= args.totalJobs:
    raise ValueError(
        f"Current job number must be within the range [0, {args.totalJobs}).")
  if args.maxStatVars is not None and args.maxStatVars <= 0:
    raise ValueError("maxStatVars must be a positive integer.")


def get_bq_query(num_partitions: int,
                 curr_partition: int,
                 limit: int | None = None) -> str:
  """
  Returns the BigQuery query to fetch the SVs. 
  Uses the FARM_FINGERPRINT function to partition the SVs into num_partitions, and only fetches the SVs in the current partition.
  If limit is specified, adds a LIMIT clause to the query.
  """
  query = BIGQUERY_QUERY_BASE + f" AND MOD(ABS(FARM_FINGERPRINT(id)), {num_partitions}) = {curr_partition}"
  if limit is not None:
    query += f" LIMIT {limit}"
  return query


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


def create_sv_metadata_bigquery(num_partitions: int,
                                curr_partition: int,
                                max_stat_vars: int | None = None) -> Iterator:
  """
  Fetches all the SVs from BigQuery, and returns them in batches of PAGE_SIZE (3000).
  """
  client = bigquery.Client()
  query = get_bq_query(num_partitions, curr_partition, max_stat_vars)
  query_job = client.query(query)
  results = query_job.result(page_size=PAGE_SIZE)

  return results.pages


def create_sv_metadata_nl() -> list[dict[str, str]]:
  """
  Fetches the SVs and their sentences from the STAT_VAR_SHEET currently used for NL, and returns them as dictionaries in batches of BATCH_SIZE (100).
  """
  stat_var_sentences = pd.read_csv(STAT_VAR_SHEET)
  batched_list: list[pd.DataFrame] = split_into_batches(stat_var_sentences)
  batched_dicts: list[dict[str, str]] = [
      curr_batch.set_index("dcid")["sentence"].to_dict()
      for curr_batch in batched_list
  ]
  return batched_dicts


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


def flatten_dc_api_response(
    dc_api_metadata,
    dcid_to_sentence: dict[str, str]) -> list[dict[str, str | list[str]]]:
  """
  Flattens the data commons API response into a list of stat vars with their metadata.
  """
  sv_metadata_list = []
  for dcid, sentence in dcid_to_sentence.items():
    new_row = StatVarMetadata(dcid=dcid, sentence=sentence)
    dcid_data = dc_api_metadata[dcid]["arcs"]

    new_row.name = get_prop_value(dcid_data[NAME])
    new_row.measuredProperty = get_prop_value(dcid_data[MEASURED_PROPERTY])
    new_row.populationType = get_prop_value(dcid_data[POPULATION_TYPE])
    new_row.statType = get_prop_value(dcid_data[STAT_TYPE])
    new_row.constraintProperties = extract_constraint_properties_dc_api(
        dcid_data)

    sv_metadata_list.append(new_row.__dict__)

  return sv_metadata_list


def extract_metadata(
    batched_metadata: Page | list[dict[str, str]],
    use_bigquery: bool = False,
) -> list[dict[str, str | list[str]]]:
  """
  Extracts the metadata for a list of DCIDs (given as the keys in curr_batch) from the data commons API, or from BigQuery. 
  Normalizes the new metadata to type StatVarMetadata, and returns it as a list of dictionaries.
  """
  sv_metadata_list = []
  client = DataCommonsClient(api_key=DC_API_KEY)

  for curr_batch in batched_metadata:
    if use_bigquery:  # curr_batch is a bigquery.table.Row corresponding to a single SV
      constraint_properties = extract_constraint_properties_bigquery(curr_batch)
      new_row = StatVarMetadata(dcid=curr_batch.id,
                                name=curr_batch.name,
                                measuredProperty=curr_batch.measured_prop,
                                populationType=curr_batch.population_type,
                                statType=curr_batch.stat_type,
                                constraintProperties=constraint_properties)
      sv_metadata_list.append(new_row.__dict__)

    else:  # curr_batch is a dict[str, str] corresponding to a batch of 100 SVs
      response = client.node.fetch(node_dcids=list(curr_batch.keys()),
                                   expression="->*")
      response_data = response.to_dict().get("data", {})

      if not response_data:
        raise ValueError("No data found for the given DCIDs.")

      curr_batch_metadata = flatten_dc_api_response(response_data, curr_batch)
      sv_metadata_list.extend(curr_batch_metadata)

  return sv_metadata_list


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


async def generate_alt_sentences(
    gemini_client: genai.Client, gemini_config: types.GenerateContentConfig,
    gemini_prompt: str, sv_metadata: list[dict[str, str | list[str]]],
    delay: int) -> list[dict[str, str | list[str]]]:
  """
  Calls the Gemini API to generate alternative sentences for a list of SV metadata.
  Returns the full metadata with alt sentences as a list of dictionaries. If the API call
  fails, retry up to MAX_RETRIES times before returning the original, unmodified sv_metadata.
  """
  await asyncio.sleep(
      delay
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
      response_schema=list[StatVarMetadata]
  )  # TODO: Add response_schemas in French/Spanish
  batched_list: list[list[dict[str, str | list[str]]]] = split_into_batches(
      sv_metadata_list)

  parallel_tasks: list[asyncio.Task] = []
  for index, curr_batch in enumerate(batched_list):
    parallel_tasks.append(
        generate_alt_sentences(gemini_client, gemini_config, gemini_prompt,
                               curr_batch, index * 5))

  batched_results: list[list[dict[str,
                                  str | list[str]]]] = await asyncio.gather(
                                      *parallel_tasks)

  results: list[dict[str, str | list[str]]] = []
  for batch in batched_results:
    results.extend(batch)
  return results


def export_to_json(sv_metadata_list: list[dict[str, str | list[str]]],
                   exported_filename: str,
                   should_save_to_gcs: bool,
                   gcs_folder: str = GCS_FILE_DIR) -> None:
  """
  Exports the SV metadata list to a JSON file.
  """
  filename = f"{exported_filename}.json"
  local_file_path = f"{EXPORTED_FILE_DIR}/{filename}"
  sv_metadata_df = pd.DataFrame(sv_metadata_list)
  sv_metadata_json = sv_metadata_df.to_json(orient="records", lines=True)

  if should_save_to_gcs:
    gcs_client = storage.Client(project=GCS_PROJECT_ID)
    bucket = gcs_client.bucket(GCS_BUCKET)
    gcs_file_path = f"{gcs_folder}/{filename}"
    blob = bucket.blob(gcs_file_path)
    blob.upload_from_string(sv_metadata_json, content_type="application/json")

    print(
        f"{len(sv_metadata_list)} statvars saved to gs://{GCS_BUCKET}/{gcs_file_path}"
    )
    return

  with open(local_file_path, "w") as f:
    f.write(sv_metadata_json)
  print(f"{len(sv_metadata_list)} statvars saved to {local_file_path}")


async def main():
  args: argparse.Namespace = extract_flag()
  verify_args(args)

  if args.useBigQuery:
    # Fetch from all 700,000+ SVs from BigQuery
    # SV Metadata is returned as an iterator of pages, where each page contains up to PAGE_SIZE (3000) SVs.
    sv_metadata_iter: Iterator = create_sv_metadata_bigquery(
        args.totalJobs, args.currJob, args.maxStatVars)
  else:
    # Fetch from only the ~3600 SVs currently used for NL
    # SV Metadata is returned from create_sv_metadata_nl as a list of dictionaries, where each dictionary contains up to BATCH_SIZE (100) SVs.
    # Wrap all the SVs in a list to normalize against BigQuery's page iterator - all 3600 SVs can be treated as one "page"
    sv_metadata_iter: list[list[dict[str, str]]] = [create_sv_metadata_nl()]

  target_language = args.language
  exported_sv_file, gemini_prompt = get_language_settings(target_language)

  page_number: int = 1
  for sv_metadata_list in sv_metadata_iter:
    full_metadata: list[dict[str, str | list[str]]] = extract_metadata(
        sv_metadata_list, args.useBigQuery)
    if args.generateAltSentences:
      print(
          f"Starting to generate alt sentences for batch number {page_number}")
      full_metadata = await batch_generate_alt_sentences(
          full_metadata, gemini_prompt)
    exported_filename = f"{exported_sv_file}_{page_number}"
    if args.totalJobs > 1:
      exported_filename = f"{exported_sv_file}_job{args.currJob}_{page_number}"
    export_to_json(full_metadata, exported_filename, args.saveToGCS,
                   args.gcsFolder)
    page_number += 1


asyncio.run(main())
