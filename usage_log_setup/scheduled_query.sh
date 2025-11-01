#!/bin/bash

# Sourcing constants
source ./usage_log_setup/config.sh

# TODO: need to create the daily_logs table if it doesn't exist
# or maybe that's part of the first-query header? so just run that once

# Sets the table that the aggregate query reads the query-level logs from, so this isn't hard-coded in the SQL file
FORMATTED_QUERY=$(
  # 1. Substitute the DESTINATION_PROJECT_ID -- this is the project that contains the tables we're reading AND writing to
  sed "s|{{DESTINATION_PROJECT_ID}}|${DESTINATION_PROJECT_ID}|g" "${SQL_FILE}" |
  # 2. Substitute the DESTINATION_DATASET -- this is the dataset that contains the tables we're reading from
  sed "s|{{DESTINATION_DATASET}}|${DESTINATION_DATASET}|g" |
  # 3. Substitute the DESTINATION_TABLE -- is the table in the DESTINATION_DATASET that we're reading from
  sed "s|{{DESTINATION_TABLE}}|${DESTINATION_TABLE}|g" |
  sed "s|{{AGGREGATION_TABLE}}|${AGGREGATION_TABLE}|g"
)

# Formats the query as a JSON object
PARAMS_JSON=$(jq -n --arg q "$FORMATTED_QUERY" '{"query": $q}')

# Create the scheduled query
# The bq mk command below creates a BigQuery scheduled query with the following parameters:
# --transfer_config: Specifies that this is a transfer configuration.
# --project_id: The project that contains the dataset we're writing to.
# --display_name: The name of the scheduled query on the GCP console.
# --data_source: Tells BQ that our data "transfer" is in the form of a scheduled query.
# --schedule: How often the query runs.
# --params: A JSON object containing the query that will be run
bq mk \
  --transfer_config \
  --project_id="${DESTINATION_PROJECT_ID}" \
  --target_dataset="${DESTINATION_DATASET}" \
  --display_name="${SCHEDULED_QUERY_NAME}" \
  --data_source=scheduled_query \
  --schedule='every 24 hours' \
  --params="${PARAMS_JSON}"

# (Optional) Adds a description to the table created by the scheduled query
# Might have to wait a few minutes after creating the scheduled query for the table to be created
# bq update \
#   --description "${AGGREGATION_TABLE_DESCRIPTION}" \
#   ${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}.${AGGREGATION_TABLE}