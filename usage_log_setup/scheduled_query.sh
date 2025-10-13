#!/bin/bash

# Sourcing constants
source ./usage_log_setup/config.sh

# Sets the table that the aggregate query reads the query-level logs from, so this isn't hard-coded in the SQL file
FORMATTED_QUERY=$(
  # 1. Substitute the DESTINATION_PROJECT_ID -- this is the project that contains the tables we're reading AND writing to
  sed "s|{{DESTINATION_PROJECT_ID}}|${DESTINATION_PROJECT_ID}|g" "${SQL_FILE}" |
  # 2. Substitute the DESTINATION_DATASET -- this is the dataset that contains the tables we're reading from
  sed "s|{{DESTINATION_DATASET}}|${DESTINATION_DATASET}|g" |
  # 3. Substitute the DESTINATION_TABLE -- is the table in the DESTINATION_DATASET that we're reading from
  sed "s|{{DESTINATION_TABLE}}|${DESTINATION_TABLE}|g"
)

# Formats the query as a JSON object
PARAMS_JSON=$(jq -n --arg q "$FORMATTED_QUERY" '{"query": $q, "destination_table_name_template": "daily_logs", "write_disposition": "WRITE_APPEND", "partitioning_field": "timestamp"}')

# Create the scheduled query
bq mk \
  --transfer_config \
  # The project that contains the dataset we're writing to
  --project_id="${DESTINATION_PROJECT_ID}" \
  # The name of the dataset we're writing to -- the aggregated table will be created in this dataset
  --target_dataset="${DESTINATION_DATASET}" \
  # The name of the scheduled query on the GCP console
  --display_name="${SCHEDULED_QUERY_NAME}" \
  # Tells BQ that our data "transfer" is in the form of a scheduled query
  --data_source=scheduled_query \
  # How often the query runs
  --schedule='every 24 hours' \
  # query: The query to schedule
  # destination_table_name_template: The name of the table that the query writes to
  # write_disposition: WRITE_APPEND means that new rows are appended to the table instead of overwriting it
  # partitioning_field (optional): we partition the BQ table by timestamp, which can reduce storage costs and improve query performance
  --params="${PARAMS_JSON}"


# (Optional) Adds a description to the table created by the scheduled query
# Might have to wait a few minutes after creating the scheduled query for the table to be created
# bq update \
#   --description "${AGGREGATION_TABLE_DESCRIPTION}" \
#   ${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}.${AGGREGATION_TABLE}