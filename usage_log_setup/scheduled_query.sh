#!/bin/bash

# Sourcing constants
source ./usage_log_setup/config.sh

# Sets the table that the aggregate query reads the query-level logs from
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
  --project_id="${DESTINATION_PROJECT_ID}" \
  --target_dataset="${DESTINATION_DATASET}" \
  --display_name="${SCHEDULED_QUERY_NAME}" \
  --data_source=scheduled_query \
  --schedule='every 24 hours' \
  --params="${PARAMS_JSON}"


# (Optional) Adding a description to the table created by the scheduled query
# Might have to wait a few minutes after creating the scheduled query for the table to be created
# bq update \
#   --description "${AGGREGATION_TABLE_DESCRIPTION}" \
#   ${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}.${AGGREGATION_TABLE}