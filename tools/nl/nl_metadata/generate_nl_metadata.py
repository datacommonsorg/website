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
1. Import the existing data commons SVs from either the existing NL SVs or BigQuery, or from a user-specified file path. 
   If importing from BQ, separate the table into {num_partitions} and only process the SVs from {curr_partition} as specified by flag arguments, returning the data in pages of up to 3000 SVs.
2. For each page, extract the metadata (either from DC API or BQ) and any constraintProperties to store in a list. Skip this step if reading previously failed attempts from a user-specified file.
3. Optionally, call the Gemini API in parallel batches of up to 100 SVs each to generate approximately 5 alternative sentences per SV based on the metadata. 
   Also translate the metadata if a target language is specified.
   If this step fails after MAX_RETRIES, the failed metadata will be saved to a separate file.
4. Create a new dataframe with the SVs and their full metadata, and export it as a JSON file sv_complete_metadata_{target_language}_{page_number}.json.
   If the flag --useGCS is specified, save to cloud storage instead under a folder named with the current date.

To run this script, make a copy of .env.sample and register your data commons and Gemini API keys to DOTENV_FILE_PATH (./.env), then run the script using the command ./generate_nl_metadata.py
"""
import argparse
import asyncio
from datetime import datetime
import json
import os
import typing

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
from schemas import englishSchema
from schemas import frenchSchema
from schemas import spanishSchema
from schemas import StatVarMetadata

DOTENV_FILE_PATH = "tools/nl/nl_metadata/.env"

BATCH_SIZE = 100
PAGE_SIZE = 3000
# BigQuery query to fetch the SVs. Excludes experimental SVs because they are not present in the prod data commons KG.
# Also excludes SVs with null names, as these don't have enough metadata for Gemini to generate alt sentences.
BIGQUERY_QUERY_BASE = "SELECT * FROM `datcom-store.dc_kg_latest.StatisticalVariable` WHERE name IS NOT NULL AND prov_id != \"dc/base/ExperimentalStatVars\""
STAT_VAR_SHEET = "tools/nl/embeddings/input/base/sheets_svs.csv"
EXPORTED_FILE_DIR = "tools/nl/nl_metadata"
OUTPUT_FILENAME_PREFIX = "sv_complete_metadata"
GCS_PROJECT_ID = "datcom-nl"
GCS_BUCKET = "metadata_for_vertexai_search"
GCS_FILE_DIR_RETRIES = "statvar_metadata_retries"
GCS_FILE_DIR_FULL = "full_statvar_metadata_staging"
GCS_FILE_DIR_NL = "nl_statvar_metadata_staging"

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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


def extract_flags() -> argparse.Namespace:
  """
  Defines and extracts the script flags from the command line arguments.
  Note that for boolean flags (--useGCS, and --useBigQuery), if these flags are present in the command line, 
  they will be set to True.
  """
  parser = argparse.ArgumentParser(description="./generate_nl_metadata.py")
  parser.add_argument(
      "--geminiApiKey",
      help="The Gemini API key to use for generating alternative sentences.",
      type=str,
      default=GEMINI_API_KEY)  # Default to the key in .env
  parser.add_argument(
      "--language",
      help=
      "The language to return the metadata results in. Currently supports English, French, and Spanish.",
      choices=["English", "French", "Spanish"
              ],  # TODO: Add support for passing multiple languages at once
      type=str,
      default="English")
  parser.add_argument("--useGCS",
                      help="Whether to save results to/read input from GCS.",
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
      "The folder in the GCS bucket to save the results to. If unspecified, will choose one of 'full_statvar_metadata_staging', 'nl_statvar_metadata_staging' or 'statvar_metadata_retries' depending on other user inputs.",
      type=str,
      default=None)
  parser.add_argument(
      "--totalPartitions",
      help=
      "The total number of partitions to run in parallel, each using a different Gemini API key. Only used if --useBigQuery is specified.",
      type=int,
      default=1)
  parser.add_argument(
      "--currPartition",
      help=
      "The current partition number (0-indexed) to run. Should be within the range [0, totalPartitions). Only used if --useBigQuery is specified.",
      type=int,
      default=0)
  parser.add_argument(
    "--failedAttemptsPath",
    help="Path to a JSON file (or folder of files) containing previously failed SV metadata to re-process. If --useGCS is also specified, the file should be in the GCS bucket. " \
    "Note that the specified file should contain all metadata - If this flag is used, neither BQ nor the DC API will be called.",
    type=str,
    default=None
  )
  args = parser.parse_args()
  return args


def verify_gcs_path_exists(gcs_path: str) -> bool:
  """
  Verifies that the GCS path exists.
  Returns True if the path exists, False otherwise.
  """
  gcs_client = storage.Client(project=GCS_PROJECT_ID)
  bucket = gcs_client.bucket(GCS_BUCKET)

  if gcs_path.endswith('.json'):  # Path is a file
    blob = bucket.blob(gcs_path)
    return blob.exists()
  else:  # Path is a folder
    blobs = list(bucket.list_blobs(prefix=gcs_path, max_results=1))
    return len(blobs) > 0


def verify_args(args: argparse.Namespace) -> None:
  """
  Verifies the command line arguments passed to the script.
  Raises an error if any of the arguments are invalid.
  """
  if args.totalPartitions <= 0:
    print("Error: Total number of partitions must be greater than 0.")
    raise ValueError("Total number of partitions must be greater than 0.")
  if args.currPartition < 0 or args.currPartition >= args.totalPartitions:
    print(f"Error: Current partition number must be within the range [0, {args.totalPartitions}).")
    raise ValueError(
        f"Current partition number must be within the range [0, {args.totalPartitions})."
    )
  if args.maxStatVars is not None and args.maxStatVars <= 0:
    print("Error: maxStatVars must be a positive integer.")
    raise ValueError("maxStatVars must be a positive integer.")
  if args.failedAttemptsPath and not args.failedAttemptsPath.endswith(
      (".json", "/")):
    print("Error: failedAttemptsPath must be a path to a JSON file or a folder of JSON files.")
    raise ValueError(
        "failedAttemptsPath must be a path to a JSON file or a folder of JSON files."
    )
  if args.failedAttemptsPath and args.useGCS and not verify_gcs_path_exists(
      args.failedAttemptsPath):
    print(f"Error: GCS path {args.failedAttemptsPath} does not exist.")
    raise ValueError(
        f"GCS path {args.failedAttemptsPath} does not exist. Please check the path and try again."
    )
  elif args.failedAttemptsPath and not args.useGCS and not os.path.exists(
      args.failedAttemptsPath):
    print(f"Error: Local path {args.failedAttemptsPath} does not exist.")
    raise ValueError(
        f"Local path {args.failedAttemptsPath} does not exist. Please check the path and try again."
    )


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
    original_df: pd.DataFrame | list,
    batch_size: int = BATCH_SIZE) -> list[pd.DataFrame] | list[list]:
  """
  Splits a dataframe into batches of a given size.
  Ex. [1, 2, 3, 4, 5, 6] with BATCH_SIZE = 2 becomes [[1, 2], [3, 4], [5, 6]]
  """
  batched_df_list = []
  for i in range(0, len(original_df), batch_size):
    batched_df_list.append(original_df[i:i + batch_size])
  return batched_df_list


def read_sv_metadata_failed_attempts(
    failed_attempts_path: str,
    use_gcs: bool) -> list[dict[str, str | list[str]]]:
  """
  Reads previously failed SV metadata from either GCS or a local file path.
  """
  print(f"Reading failed attempts from: {failed_attempts_path}")
  sv_metadata_to_process: list[dict[str, str | list[str]]] = []

  def read_jsonl(file: typing.TextIO | list[str],
                 metadata_list: list[dict[str, str | list[str]]]):
    """
    Reads a JSONL file and appends each line as a dictionary to the metadata_list.
    """
    for line in file:
      entry = json.loads(line)
      metadata_list.append(entry)
    return metadata_list

  if use_gcs:
    gcs_client = storage.Client(project=GCS_PROJECT_ID)
    bucket = gcs_client.bucket(GCS_BUCKET)

    blobs = []
    if failed_attempts_path.endswith('.json'):  # Treat as a specific file
      blobs = [bucket.blob(failed_attempts_path)]
    else:  # Treat as a folder prefix
      blobs = list(bucket.list_blobs(prefix=failed_attempts_path))

    for blob in blobs:
      if blob.name.endswith(".json"):
        print(f"Processing failed attempts from GCS: {blob.name}")
        failed_data_str = blob.download_as_text()
        sv_metadata_to_process = read_jsonl(failed_data_str.splitlines(),
                                            sv_metadata_to_process)
  else:  # Read from local file system
    if os.path.isdir(failed_attempts_path):
      for filename in os.listdir(failed_attempts_path):
        if filename.endswith(".json"):
          local_file_path = os.path.join(failed_attempts_path, filename)
          print(
              f"Processing failed attempts from local file: {local_file_path}")
          with open(local_file_path, 'r') as f:
            sv_metadata_to_process = read_jsonl(f, sv_metadata_to_process)
    else:
      print(
          f"Processing failed attempts from local file: {failed_attempts_path}")
      with open(failed_attempts_path, 'r') as f:
        sv_metadata_to_process = read_jsonl(f, sv_metadata_to_process)
  return split_into_batches(sv_metadata_to_process, PAGE_SIZE)


def create_sv_metadata_bigquery(num_partitions: int,
                                curr_partition: int,
                                max_stat_vars: int | None = None) -> Iterator:
  """
  Fetches all the SVs from BigQuery, and returns them in batches of PAGE_SIZE (3000).
  """
  print(f"Fetching SV metadata from BigQuery (Partition {curr_partition}/{num_partitions})...")
  client = bigquery.Client()
  query = get_bq_query(num_partitions, curr_partition, max_stat_vars)
  query_job = client.query(query)
  results = query_job.result(page_size=PAGE_SIZE)

  return results.pages


def create_sv_metadata_nl() -> list[dict[str, str]]:
  """
  Fetches the SVs and their sentences from the STAT_VAR_SHEET currently used for NL, and returns them as dictionaries in batches of BATCH_SIZE (100).
  """
  print("Fetching SV metadata from NL sheet...")
  stat_var_sentences = pd.read_csv(STAT_VAR_SHEET)
  batched_list: list[pd.DataFrame] = split_into_batches(stat_var_sentences)
  batched_dicts: list[dict[str, str]] = [
      curr_batch.set_index("dcid")["sentence"].to_dict()
      for curr_batch in batched_list
  ]
  return batched_dicts


def get_language_settings(target_language: str) -> tuple[str, str]:
  match target_language:
    case "French":
      language_schema = json.dumps(frenchSchema)
    case "Spanish":
      language_schema = json.dumps(spanishSchema)
    case _:
      language_schema = json.dumps(englishSchema)

  # TODO(gmechali): Uncomment if we want to support other languages.
  # return output_file_name, get_gemini_prompt_with_translations(target_language, language_schema)

  output_file_name = f"{OUTPUT_FILENAME_PREFIX}_{target_language}"
  return output_file_name, get_gemini_prompt(language_schema)


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
    new_row.numConstraints = len(new_row.constraintProperties)

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
  print("Extracting metadata for batch...")
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
                                constraintProperties=constraint_properties,
                                numConstraints=len(constraint_properties))
      sv_metadata_list.append(new_row.__dict__)

    else:  # curr_batch is a dict[str, str] corresponding to a batch of 100 SVs
      response = client.node.fetch(node_dcids=list(curr_batch.keys()),
                                   expression="->*")
      response_data = response.to_dict().get("data", {})

      if not response_data:
        raise ValueError("No data found for the given DCIDs.")
      else:
        print(f"Fetched metadata for {len(response_data)} DCIDs.")

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
          f"All {MAX_RETRIES} retry attempts failed for the batch starting at DCID {batch_start_dcid}. Returning original sv_metadata."
      )
      return sv_metadata

    print(f"Retrying after {RETRY_DELAY_SECONDS} seconds...")
    await asyncio.sleep(RETRY_DELAY_SECONDS)


async def batch_generate_alt_sentences(
    sv_metadata_list: list[dict[str, str | list[str]]], gemini_api_key: str,
    gemini_prompt: str
) -> tuple[list[dict[str, str | list[str]]], list[dict[str, str | list[str]]]]:
  """
  Separates sv_metadata_list into batches of 100 entries, and executes multiple parallel calls to generate_alt_sentences
  using Gemini and existing SV metadata. Flattens the list of results, and returns the metadata as a list of dictionaries.
  """
  print(f"Starting batch generation of alternative sentences for {len(sv_metadata_list)} StatVars...")
  gemini_client = genai.Client(api_key=gemini_api_key)
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

  # TODO: Add validation to check that returned results match DCIDs in the input batches
  batched_results: list[list[dict[str,
                                  str | list[str]]]] = await asyncio.gather(
                                      *parallel_tasks)

  results: list[dict[str, str | list[str]]] = []
  failed_results: list[dict[str, str | list[str]]] = []

  for batch in batched_results:
    if batch[0]["generatedSentences"] is not None:
      results.extend(batch)
    else:
      starting_dcid = batch[0]["dcid"]
      print(
          f"Added failed batch starting at DCID {starting_dcid} to failed results."
      )
      failed_results.extend(batch)
  return results, failed_results


def get_gcs_folder(gcs_folder: str | None, failed_attempts_path: str | None,
                   use_bigquery: bool) -> str:
  """
  Returns the GCS folder to save the results to based on the user inputs.
  """
  date_folder = datetime.now().strftime("%Y_%m_%d")

  # The periodic folder is used for datastores with periodic ingestion.
  if gcs_folder:
    if gcs_folder.endswith('periodic'):
      return gcs_folder
    else:
      # Store results in timestamp subfolders.
      return f"{gcs_folder}/{date_folder}"

  if failed_attempts_path:
    return f"{GCS_FILE_DIR_RETRIES}/{date_folder}"

  if use_bigquery:
    return f"{GCS_FILE_DIR_FULL}/{date_folder}"

  return f"{GCS_FILE_DIR_NL}/{date_folder}"


def export_to_json(sv_metadata_list: list[dict[str, str | list[str]]],
                   exported_filename: str, should_save_to_gcs: bool,
                   gcs_folder: str | None) -> None:
  """
  Exports the SV metadata list to a JSON file.
  """
  if not sv_metadata_list:
    print(f"No StatVars to export for {exported_filename}. Skipping export.")
    return

  print(f"Exporting {len(sv_metadata_list)} StatVars to {exported_filename}.json...")
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
  else:
    os.makedirs(f"{EXPORTED_FILE_DIR}/failures", exist_ok=True)
    with open(local_file_path, "w") as f:
      f.write(sv_metadata_json)
    print(f"{len(sv_metadata_list)} statvars saved to {local_file_path}")


async def main():
  print("Starting NL metadata generation script...")
  args: argparse.Namespace = extract_flags()
  verify_args(args)

  # Run mode can be either: retryFailure, BigQuery, NL-only, or BigQueryDiff.

  if args.failedAttemptsPath is not None:
    print(f"Reading previously failed attempts from: {args.failedAttemptsPath}")
    sv_metadata_iter: list[list[dict[
        str, str | list[str]]]] = read_sv_metadata_failed_attempts(
            args.failedAttemptsPath, args.useGCS)
  elif args.useBigQuery:
    print("Fetching all StatVars from BigQuery...")
    # Fetch from all 700,000+ SVs from BigQuery
    # SV Metadata is returned as an iterator of pages, where each page contains up to PAGE_SIZE (3000) SVs.
    sv_metadata_iter: Iterator = create_sv_metadata_bigquery(
        args.totalPartitions, args.currPartition, args.maxStatVars)
  else:
    print("Fetching StatVars from NL sheet (curated list)...")
    # Fetch from only the ~3600 SVs currently used for NL
    # SV Metadata is returned from create_sv_metadata_nl as a list of dictionaries, where each dictionary contains up to BATCH_SIZE (100) SVs.
    # Wrap all the SVs in a list to normalize against BigQuery's page iterator - all 3600 SVs can be treated as one "page"
    sv_metadata_iter: list[list[dict[str, str]]] = [create_sv_metadata_nl()]

  target_language = args.language
  output_filename, gemini_prompt = get_language_settings(target_language)

  page_number: int = 1
  for sv_metadata_list in sv_metadata_iter:
    # When re-running failed attempts, sv_metadata_list already contains the full metadata.
    if args.failedAttemptsPath is not None:
      full_metadata = sv_metadata_list
    else:
      full_metadata: list[dict[str, str | list[str]]] = extract_metadata(
          sv_metadata_list, args.useBigQuery)
    failed_metadata: list[dict[str, str | list[str]]] = []

    # Generate the Alt Sentences using Gemini
    print(f"Generating alt sentences for batch number {page_number}")
    full_metadata, failed_metadata = await batch_generate_alt_sentences(
        full_metadata, args.geminiApiKey, gemini_prompt)

    exported_filename = f"{output_filename}_{args.currPartition+1}_{page_number}"
    failed_filename = f"failures/failed_batch_{args.currPartition+1}_{page_number}"

    gcs_folder = get_gcs_folder(args.gcsFolder, args.failedAttemptsPath,
                                args.useBigQuery) if args.useGCS else None

    export_to_json(full_metadata, exported_filename, args.useGCS, gcs_folder)
    export_to_json(failed_metadata, failed_filename, args.useGCS, gcs_folder)
    page_number += 1


if __name__ == "__main__":
  asyncio.run(main())
  print("NL metadata generation script finished.")
