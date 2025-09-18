#!/bin/bash

# --- Configuration ---
# NOTE: creating the tables in advance means the entire script can be run without waiting for the logs to propogate, but
# also requires us to manually define all of that -- seems way better to use a query in a separate doc and just use that, then
# they just run two scripts separately (this is probably claude-able)
# Replace with your project and desired names
PROJECT_ID="datcom-website-dev"
LOG_SINK_NAME="my-website-log-sink"
LOG_SINK_FILTER='resource.type="gce_instance" AND jsonPayload.log_data.website_log=true'
DATASET_ID="website_logs_dataset"
LOGS_TABLE_ID="raw_logs_table"
AGGREGATED_TABLE_ID="aggregated_daily_logs_table"
SCHEDULED_QUERY_NAME="daily_log_aggregator"
# Scheduled queries must be in a multi-region location
SCHEDULED_QUERY_LOCATION="US"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null
then
    echo "gcloud command could not be found. Please install and authenticate the Google Cloud CLI."
    exit 1
fi

echo "--- Setting up BigQuery dataset and tables ---"

# Create BigQuery dataset if it doesn't exist
bq --location="${SCHEDULED_QUERY_LOCATION}" mk --dataset --project_id="${PROJECT_ID}" "${DATASET_ID}"
if [ $? -eq 0 ]; then
    echo "Dataset '${DATASET_ID}' created successfully."
else
    echo "Dataset '${DATASET_ID}' already exists or could not be created."
fi

# Define schema for the raw logs table
# Note: The schema is a simplified version; you may need to adjust it to match your exact log format.
LOGS_SCHEMA='timestamp:TIMESTAMP,jsonPayload:JSON,logName:STRING,receiveTimestamp:TIMESTAMP,resource.type:STRING,resource.labels.instance_id:STRING,resource.labels.project_id:STRING,resource.labels.zone:STRING'

# Create the raw logs table with partitioning and clustering
bq mk \
  --table \
  --time_partitioning_field "timestamp" \
  --time_partitioning_type "DAY" \
  --clustering_fields "jsonPayload.log_data.place_type" \
  --schema "${LOGS_SCHEMA}" \
  "${PROJECT_ID}:${DATASET_ID}.${LOGS_TABLE_ID}"
if [ $? -eq 0 ]; then
    echo "Table '${LOGS_TABLE_ID}' created successfully."
else
    echo "Table '${LOGS_TABLE_ID}' already exists or could not be created."
fi

# Define schema for the aggregated logs table
AGGREGATED_SCHEMA='timestamp:DATE,feature:STRING,stat_vars:RECORD,stat_vars.statVarDCID:STRING,stat_vars.facets:RECORD,stat_vars.facets.facet_detail:STRING,stat_vars.facets.num_entities:INTEGER,stat_vars.facets.queries_by_place_type:RECORD,stat_vars.facets.queries_by_place_type.place_type:STRING,stat_vars.facets.queries_by_place_type.query_count:INTEGER,stat_vars.facets.earliest:DATE,stat_vars.facets.latest:DATE'

# Create the aggregated logs table
bq mk \
  --table \
  --schema "${AGGREGATED_SCHEMA}" \
  "${PROJECT_ID}:${DATASET_ID}.${AGGREGATED_TABLE_ID}"
if [ $? -eq 0 ]; then
    echo "Table '${AGGREGATED_TABLE_ID}' created successfully."
else
    echo "Table '${AGGREGATED_TABLE_ID}' already exists or could not be created."
fi

echo "--- Creating the GCP log sink ---"

# The destination for the log sink
DESTINATION="bigquery.googleapis.com/projects/${PROJECT_ID}/datasets/${DATASET_ID}"

# Create the log sink
gcloud logging sinks create "${LOG_SINK_NAME}" "${DESTINATION}" \
  --log-filter="${LOG_SINK_FILTER}" \
  --project="${PROJECT_ID}"
if [ $? -eq 0 ]; then
    echo "Log sink '${LOG_SINK_NAME}' created successfully."
    echo "Please grant the service account 'writer_identity' the 'BigQuery Data Editor' role on the '${DATASET_ID}' dataset."
else
    echo "Log sink '${LOG_SINK_NAME}' already exists or could not be created."
fi

echo "--- Creating the scheduled query ---"

# Use the full destination table path for the scheduled query
TARGET_TABLE="${DATASET_ID}.${AGGREGATED_TABLE_ID}"

# The full SQL query, escaped for the command line
AGGREGATION_QUERY='
# A daily scheduled query to aggregate logs into a new table.
# This query processes the previous day''s logs into one log entry representing all queries that happened during that day

WITH DailyLogs AS (
  -- daily logs unnests the daily logs to make them easier to use later on
  -- we can add a where clause here to only consider logs with a timestamp in the current day
  SELECT
    "website" as feature,
    T1.jsonPayload.log_data.place_type,
    statVar.stat_var_dcid AS statVarDCID,
    STRUCT(
      facet.facet as facet_detail,
      COALESCE(SAFE.PARSE_DATE(''"%Y"'', facet.earliest), CURRENT_DATE()) AS earliest,
      COALESCE(SAFE.PARSE_DATE(''"%Y"'', facet.latest), CURRENT_DATE()) AS latest,
      COALESCE(facet.count, 0) AS num_entities
    ) AS facet,
    1 AS query_count
  FROM
    `'${PROJECT_ID}'.'${DATASET_ID}'.'${LOGS_TABLE_ID}'` AS T1,
    UNNEST(T1.jsonPayload.log_data.stat_vars) AS statVar,
    UNNEST(statVar.facets) AS facet
  WHERE
    DATE(T1.timestamp) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
),

AggregatedPlaceTypes AS (
  SELECT
    feature,
    statVarDCID,
    STRUCT(
      facet_detail,
      SUM(num_entities) AS num_entities,
      ARRAY_AGG(STRUCT(place_type, query_count) ORDER BY place_type) AS queries_by_place_type,
      MIN(earliest) as earliest,
      MAX(latest) as latest
    ) AS facet
  FROM (
    SELECT
      feature,
      statVarDCID,
      facet.facet_detail AS facet_detail,
      place_type,
      COUNT(query_count) AS query_count,
      SUM(facet.num_entities) AS num_entities,
      MIN(facet.earliest) as earliest,
      MAX(facet.latest) as latest
    FROM DailyLogs
    GROUP BY
      feature,
      statVarDCID,
      facet.facet_detail,
      place_type
  )
  GROUP BY
    feature,
    statVarDCID,
    facet_detail
),

AggregatedStatVars AS (
  SELECT
    feature,
    statVarDCID,
    ARRAY_AGG(
      facet
    ) AS facets
  FROM AggregatedPlaceTypes
  GROUP BY
    feature,
    statVarDCID
)

SELECT 
  PARSE_DATE(''"%Y-%m-%d"'', CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) AS STRING)) AS timestamp,
  feature,
  ARRAY_AGG(
      STRUCT(
        statVarDCID,
        facets
      )
    ) AS stat_vars
FROM AggregatedStatVars
GROUP BY 
  feature
'

# Create the scheduled query using `gcloud bq scheduled-queries`
gcloud alpha bq scheduled-queries create \
  --display_name="${SCHEDULED_QUERY_NAME}" \
  --location="${SCHEDULED_QUERY_LOCATION}" \
  --project="${PROJECT_ID}" \
  --target_dataset="${DATASET_ID}" \
  --target_table="${AGGREGATED_TABLE_ID}" \
  --target_table_is_partitioned \
  --schedule="every 24 hours" \
  --query="${AGGREGATION_QUERY}"
if [ $? -eq 0 ]; then
    echo "Scheduled query '${SCHEDULED_QUERY_NAME}' created successfully."
else
    echo "Scheduled query '${SCHEDULED_QUERY_NAME}' already exists or could not be created."
fi