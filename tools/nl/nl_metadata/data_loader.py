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
This file contains all the functions for loading statistical variable data from
different sources like BigQuery, GCS, and local files.
"""

import json
import os
import typing

import config
from datacommons_client.client import DataCommonsClient
from google.api_core.page_iterator import Iterator
from google.api_core.page_iterator import Page
from google.cloud import bigquery
from google.cloud import storage
import pandas as pd
from schemas import StatVarMetadata
from utils import extract_constraint_properties_bigquery
from utils import extract_constraint_properties_dc_api
from utils import get_prop_value
from utils import split_into_batches


def get_bq_query(num_partitions: int,
                 curr_partition: int,
                 limit: int | None = None) -> str:
  """
  Returns the BigQuery query to fetch the SVs. 
  Uses the FARM_FINGERPRINT function to partition the SVs into num_partitions, and only fetches the SVs in the current partition.
  If limit is specified, adds a LIMIT clause to the query.
  """
  query = config.BIGQUERY_QUERY_BASE + f" AND MOD(ABS(FARM_FINGERPRINT(id)), {num_partitions}) = {curr_partition}"
  if limit is not None:
    query += f" LIMIT {limit}"
  return query


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
    gcs_client = storage.Client(project=config.GCS_PROJECT_ID)
    bucket = gcs_client.bucket(config.GCS_BUCKET)

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
  return split_into_batches(sv_metadata_to_process, config.PAGE_SIZE)


def read_gcs_jsonl_ids(gcs_folder_path: str) -> set[str]:
  """
  Reads all JSONL files in a GCS folder and extracts DCIDs from them.
  """
  print(f"Reading DCIDs from GCS folder: {gcs_folder_path}")
  gcs_client = storage.Client(project=config.GCS_PROJECT_ID)
  bucket = gcs_client.bucket(config.GCS_BUCKET)

  dcids = set()
  blobs = list(bucket.list_blobs(prefix=gcs_folder_path, delimiter="/"))
  for blob in blobs:
    if blob.name.endswith(".jsonl") or blob.name.endswith(
        ".json"):  # Assuming JSONL or JSON files
      print(f"  Processing GCS file: {blob.name}")
      content = blob.download_as_text()
      for line in content.splitlines():
        try:
          data = json.loads(line)
          if "dcid" in data:
            dcids.add(data["dcid"])
        except json.JSONDecodeError:
          print(
              f"Warning: Could not decode JSON from line in {blob.name}: {line[:50]}..."
          )
  print(
      f"Finished reading {len(dcids)} DCIDs from GCS folder: {gcs_folder_path}")
  return dcids


def create_sv_metadata_bigquery(num_partitions: int,
                                curr_partition: int,
                                max_stat_vars: int | None = None) -> Iterator:
  """
  Fetches all the SVs from BigQuery, and returns them in batches of PAGE_SIZE.
  """
  print(
      f"Fetching SV metadata from BigQuery (Partition {curr_partition+1}/{num_partitions})..."
  )
  client = bigquery.Client()
  query = get_bq_query(num_partitions, curr_partition, max_stat_vars)
  query_job = client.query(query)
  results = query_job.result(page_size=config.PAGE_SIZE)

  return results.pages


def get_bigquery_diffs_metadata(gcs_periodic_folder: str, num_partitions: int,
                                curr_partition: int,
                                max_stat_vars: int | None) -> Iterator:
  """
  Finds the diffs between BigQuery and GCS periodic folder, and fetches metadata for them.
  """
  print(f"Starting BigQuery Diffs mode for GCS folder: {gcs_periodic_folder}")

  # 1. Get existing StatVar IDs from GCS periodic folder
  existing_gcs_ids = read_gcs_jsonl_ids(gcs_periodic_folder)

  # 2. Get current StatVar IDs from BigQuery
  # Fetch only IDs from BigQuery for efficiency
  print("Fetching all current StatVar IDs from BigQuery for diff comparison...")
  bq_client = bigquery.Client()
  bq_query_ids = config.BIGQUERY_QUERY_BASE + f" AND MOD(ABS(FARM_FINGERPRINT(id)), {num_partitions}) = {curr_partition}"
  if max_stat_vars is not None:
    bq_query_ids += f" LIMIT {max_stat_vars}"

  query_job_ids = bq_client.query(bq_query_ids)
  current_bq_ids = set()
  for row in query_job_ids.result():
    current_bq_ids.add(row.id)
  print(
      f"Finished fetching {len(current_bq_ids)} current StatVar IDs from BigQuery."
  )

  # 3. Find the diff
  new_statvar_ids = current_bq_ids - existing_gcs_ids
  print(
      f"Found {len(new_statvar_ids)} new/changed StatVars in BigQuery compared to GCS periodic folder.\n{list(new_statvar_ids)}"
  )

  # 4. Fetch full metadata for new StatVars from BigQuery
  if not new_statvar_ids:
    return iter([])

  # This generator will query BQ in batches and yield pages of results.
  def pages_generator(dcids_set):
    # Re-use the client from the parent scope.
    batched_ids = split_into_batches(list(dcids_set),
                                     config.BIGQUERY_IN_CLAUSE_BATCH_SIZE)
    for batch in batched_ids:
      if not batch:
        continue
      # Using quotes for string values in IN clause
      formatted_ids = ", ".join([f'\"{id}\"' for id in batch])
      query = f"{config.BIGQUERY_QUERY_BASE} AND id IN ({formatted_ids})"
      query_job = bq_client.query(query)
      results = query_job.result(page_size=config.PAGE_SIZE)
      yield from results.pages

  return pages_generator(new_statvar_ids)


def create_sv_metadata_nl() -> list[dict[str, str]]:
  """
  Fetches the SVs and their sentences from the STAT_VAR_SHEET currently used for NL, and returns them as dictionaries in batches.
  """
  print("Fetching SV metadata from NL sheet...")
  stat_var_sentences = pd.read_csv(config.STAT_VAR_SHEET)
  # BATCH_SIZE for nl_only mode is small, so we can use it directly.
  batched_list: list[pd.DataFrame] = split_into_batches(stat_var_sentences, 100)
  batched_dicts: list[dict[str, str]] = [
      curr_batch.set_index("dcid")["sentence"].to_dict()
      for curr_batch in batched_list
  ]
  return batched_dicts


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

    new_row.name = get_prop_value(dcid_data[config.NAME])
    new_row.measuredProperty = get_prop_value(
        dcid_data[config.MEASURED_PROPERTY])
    new_row.populationType = get_prop_value(dcid_data[config.POPULATION_TYPE])
    new_row.statType = get_prop_value(dcid_data[config.STAT_TYPE])
    new_row.constraintProperties = extract_constraint_properties_dc_api(
        dcid_data)
    new_row.numConstraints = len(new_row.constraintProperties)

    sv_metadata_list.append(new_row.__dict__)

  return sv_metadata_list


def extract_metadata(
    batched_metadata: Page | list[dict[str, str]],
    dc_api_key: str,
    use_bigquery: bool = False,
) -> list[dict[str, str | list[str]]]:
  """
  Extracts the metadata for a list of DCIDs (given as the keys in curr_batch) from the data commons API, or from BigQuery. 
  Normalizes the new metadata to type StatVarMetadata, and returns it as a list of dictionaries.
  """
  print("Extracting metadata for batch...")
  sv_metadata_list = []
  client = DataCommonsClient(api_key=dc_api_key)

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
