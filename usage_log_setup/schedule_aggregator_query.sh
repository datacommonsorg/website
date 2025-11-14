#!/bin/bash

# Sourcing constants
source ./usage_log_setup/.env

# Check if the destination table exists and is not empty.
# It can take a few minutes after creating the log sink for logs to start appearing in BigQuery,
# but they need to be present in the table before we can create the scheduled query.
TABLE_ID="${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}.${DESTINATION_TABLE}"
echo "Checking status of source table: ${TABLE_ID}"

# Check if table exists
if ! bq show --format=prettyjson "${TABLE_ID}" > /dev/null 2>&1; then
    echo "Error: Source table ${TABLE_ID} does not exist. Please ensure the log sink is configured correctly and has had time to ingest logs."
    exit 1
fi

# Check if table is empty
NUM_ROWS=$(bq show --format=prettyjson "${TABLE_ID}" | jq -r '.numRows')

if [ -z "${NUM_ROWS}" ] || [ "${NUM_ROWS}" -le 0 ]; then
    echo "Error: Source table ${TABLE_ID} is empty. Please wait for logs to be ingested before running this script."
    exit 1
fi

echo "Source table ${TABLE_ID} exists and contains ${NUM_ROWS} rows. Proceeding..."

# Now create the scheduled query
# Because the scheduled query writes to a new aggregation table, we run a CREATE TABLE AS ... statement 
# if the table doesn't already exist. This automatically formats the table with the correct schema.
# Because of how large and complex the schema for the aggregated logs is, this is simpler than creating the table
# and manually specifying the schema.

# This is the header used if the aggregation table doesn't previously exist. It inserts one daily log to establish the schema.
CREATE_TABLE_HEADER="CREATE OR REPLACE TABLE"
# This is the header used for inserting new rows into an existing table. This is what will be included in the scheduled query.
INSERT_ROW_HEADER="INSERT INTO"

# Sets the table that the aggregate query reads the query-level logs from, so this isn't hard-coded in the SQL file
# The query command header is set based on whether the dataset was newly created.
if ${CREATED_DATASET}; then
    QUERY_COMMAND_HEADER="${CREATE_TABLE_HEADER}"
else
    QUERY_COMMAND_HEADER="${INSERT_ROW_HEADER}"
fi

FORMATTED_QUERY=$(
  # 1. Substitute the DESTINATION_PROJECT_ID -- this is the project that contains the tables we're reading AND writing to
  sed "s|{{DESTINATION_PROJECT_ID}}|${DESTINATION_PROJECT_ID}|g" "${SQL_FILE}" |
  # 2. Substitute the DESTINATION_DATASET -- this is the dataset that contains the tables we're reading from
  sed "s|{{DESTINATION_DATASET}}|${DESTINATION_DATASET}|g" |
  # 3. Substitute the DESTINATION_TABLE -- is the table in the DESTINATION_DATASET that we're reading from
  sed "s|{{DESTINATION_TABLE}}|${DESTINATION_TABLE}|g" |
  # 4. Substitute the AGGREGATION_TABLE -- is the table in the DESTINATION_DATASET that we're writing to
  sed "s|{{AGGREGATION_TABLE}}|${AGGREGATION_TABLE}|g" |
  # 5. Substitute the QUERY_COMMAND_HEADER -- this determines if we create or insert into the table
  sed "s|{{QUERY_COMMAND_HEADER}}|${QUERY_COMMAND_HEADER}|g"
)

# !!!!!!!!!!! TODO: I don't actually need to know if the dataset was created, I need to know if the aggregation table exists.
# If the dataset was newly created, run the query once to establish the schema.
if ${CREATED_DATASET}; then
    echo "Inserting first row into the new ${DESTINATION_DATASET} dataset to establish schema."

    # CREATE OR REPLACE TABLE command to establish the table schema
    bq query \
        --project_id="${DESTINATION_PROJECT_ID}" \
        --nouse_legacy_sql \
        "${FORMATTED_QUERY}"

    echo "Row inserted."

    # Now we want to change it to INSERT INTO for the scheduled query
    SCHEDULED_QUERY_COMMAND_HEADER="${INSERT_ROW_HEADER}"
    FORMATTED_QUERY=$(
      sed "s|{{DESTINATION_PROJECT_ID}}|${DESTINATION_PROJECT_ID}|g" "${SQL_FILE}" |
      sed "s|{{DESTINATION_DATASET}}|${DESTINATION_DATASET}|g" |
      sed "s|{{DESTINATION_TABLE}}|${DESTINATION_TABLE}|g" |
      sed "s|{{AGGREGATION_TABLE}}|${AGGREGATION_TABLE}|g" |
      sed "s|{{QUERY_COMMAND_HEADER}}|${SCHEDULED_QUERY_COMMAND_HEADER}|g"
    )
fi

# Formats the query as a JSON object for the scheduled query. 
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
  --display_name="${SCHEDULED_QUERY_NAME}" \
  --target_dataset="${DESTINATION_DATASET}" \
  --data_source=scheduled_query \
  --schedule='every 24 hours' \
  --params="${PARAMS_JSON}"