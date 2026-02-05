#!/bin/bash

# Sourcing constants
source ./usage_log_setup/.env

# Check if the destination table exists and is not empty.
# It can take a few minutes after creating the log sink for logs to start appearing in BigQuery,
# but they need to be present in the table before we can create the scheduled query.
TABLE_ID="${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}.${DESTINATION_TABLE}"
AGGREGATION_TABLE_ID="${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}.${AGGREGATION_TABLE}"

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
# Because the scheduled query inserts into to a new aggregation table, we run a CREATE TABLE AS ... statement 
# if the table doesn't already exist. This automatically formats the table with the correct schema.
# Because of how large and complex the schema for the aggregated logs is, this is simpler than creating the table
# and manually specifying the schema.
if ! bq show --format=prettyjson "${AGGREGATION_TABLE_ID}" > /dev/null 2>&1; then
    DO_CREATE_TABLE=true
else
    NUM_ROWS=$(bq show --format=prettyjson "${AGGREGATION_TABLE_ID}" | jq -r '.numRows')
    if [ -z "${NUM_ROWS}" ] || [ "${NUM_ROWS}" -le 0 ]; then
        DO_CREATE_TABLE=true
    else
        DO_CREATE_TABLE=false
    fi
fi

# This is the header used if the aggregation table doesn't previously exist. It inserts one daily log to establish the schema.
CREATE_TABLE_COMMAND="CREATE OR REPLACE TABLE ${DESTINATION_PROJECT_ID}.${DESTINATION_DATASET}.${AGGREGATION_TABLE} AS"
# This is the header used for inserting new rows into an existing table. This is what will be included in the scheduled query.
INSERT_ROW_COMMAND="INSERT INTO ${DESTINATION_PROJECT_ID}.${DESTINATION_DATASET}.${AGGREGATION_TABLE} (timestamp, is_weekend, feature, num_queries, stat_vars)"

# The query command header is set based on whether the dataset was newly created.
if ${DO_CREATE_TABLE}; then
    QUERY_COMMAND="${CREATE_TABLE_COMMAND}"
    LATEST_LOG_TIME_SUBQUERY="SELECT CAST('${START_DATE}' AS TIMESTAMP) as latest_log_time"
else
    # For the scheduled query, we always want to insert new rows.
    QUERY_COMMAND="${INSERT_ROW_COMMAND}"
    LATEST_LOG_TIME_SUBQUERY="SELECT COALESCE(MAX(timestamp), CAST('2025-10-10 01:00:00' AS TIMESTAMP)) as latest_log_time FROM ${DESTINATION_PROJECT_ID}.${DESTINATION_DATASET}.${AGGREGATION_TABLE}"
fi

FORMATTED_QUERY=$( \
  # 1. Substitute the LATEST_LOG_TIME_SUBQUERY -- this determines the earliest timestamp to read logs from
  sed "s|{{LATEST_LOG_TIME_SUBQUERY}}|${LATEST_LOG_TIME_SUBQUERY}|g" "${SQL_FILE}" | \
  # 2. Substitute the DESTINATION_PROJECT_ID -- this is the project that contains the tables we're reading AND writing to
  sed "s|{{DESTINATION_PROJECT_ID}}|${DESTINATION_PROJECT_ID}|g" | \
  # 3. Substitute the DESTINATION_DATASET -- this is the dataset that contains the tables we're reading from
  sed "s|{{DESTINATION_DATASET}}|${DESTINATION_DATASET}|g" | \
  # 4. Substitute the DESTINATION_TABLE -- is the table in the DESTINATION_DATASET that we're reading FROM
  sed "s|{{DESTINATION_TABLE}}|${DESTINATION_TABLE}|g" | \
  # 5. Substitute the AGGREGATION_TABLE -- is the table in the DESTINATION_DATASET that we're writing TO
  sed "s|{{AGGREGATION_TABLE}}|${AGGREGATION_TABLE}|g" | \
  # 6. Substitute the CACHE_LOGS_TABLE -- this is the table with the website cache logs
  sed "s|{{CACHE_LOGS_TABLE}}|${CACHE_LOGS_TABLE}|g" | \
  # 7. Substitute the CACHE_LOGS_DATASET -- this is the dataset with the website cache logs
  sed "s|{{CACHE_LOGS_DATASET}}|${CACHE_LOGS_DATASET}|g" | \
  # 8. Substitute the QUERY_COMMAND -- this determines if we create or insert into the table
  sed "s|{{QUERY_COMMAND}}|${QUERY_COMMAND}|g" \
)

# If the aggregation table either doesn't exist or is empty, run the query once to establish the schema.
if ${DO_CREATE_TABLE}; then
    echo "Inserting first row into the new ${DESTINATION_DATASET} dataset to establish schema."

    # CREATE OR REPLACE TABLE command to establish the table schema
    bq query \
        --project_id="${DESTINATION_PROJECT_ID}" \
        --nouse_legacy_sql \
        ${FORMATTED_QUERY}

    echo "Row inserted."

    # Now we want to change it to INSERT INTO for the scheduled query
    SCHEDULED_QUERY_COMMAND="${INSERT_ROW_COMMAND}"
    SCHEDULED_LATEST_LOG_TIME_SUBQUERY="SELECT COALESCE(MAX(timestamp), CAST('2025-10-10 01:00:00' AS TIMESTAMP)) as latest_log_time FROM ${DESTINATION_PROJECT_ID}.${DESTINATION_DATASET}.${AGGREGATION_TABLE}"
    FORMATTED_QUERY=$( \
      sed "s|{{LATEST_LOG_TIME_SUBQUERY}}|${SCHEDULED_LATEST_LOG_TIME_SUBQUERY}|g" "${SQL_FILE}" | \
      sed "s|{{DESTINATION_PROJECT_ID}}|${DESTINATION_PROJECT_ID}|g" | \
      sed "s|{{DESTINATION_DATASET}}|${DESTINATION_DATASET}|g" | \
      sed "s|{{DESTINATION_TABLE}}|${DESTINATION_TABLE}|g" | \
      sed "s|{{AGGREGATION_TABLE}}|${AGGREGATION_TABLE}|g" | \
      sed "s|{{CACHE_LOGS_TABLE}}|${CACHE_LOGS_TABLE}|g" | \
      sed "s|{{CACHE_LOGS_DATASET}}|${CACHE_LOGS_DATASET}|g" | \
      sed "s|{{QUERY_COMMAND}}|${SCHEDULED_QUERY_COMMAND}|g" \
    )
fi

# Formats the query as a JSON object for the scheduled query. 
PARAMS_JSON=$(jq -n --arg q "${FORMATTED_QUERY}" '{"query": $q}')

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

echo "Scheduled query created."
