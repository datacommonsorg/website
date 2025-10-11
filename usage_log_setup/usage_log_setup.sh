#!/bin/bash

# --- Usage Log Setup Script ---

# 1. Have logs going to stdout in your GCP project.

# 2. Configure a log sink to route logs to a BigQuery table:
# Docs: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create 

# destination: be a BigQuery table, e.g. bigquery.googleapis.com/projects/<PROJECT_ID>/datasets/<DATASET_NAME>
#   Note that the destination BQ table can be in a different GCP project from the project where the logs are written from.
# log_filter: an attribute that only your logs have – give your logs a unique message like “usage_log_data”.
# use-partitioned-tables: tables grouped by day, which reduces storage costs.
# project: your GCP project ID for the project where the logs are coming from.

SINK_NAME="testing_script"
LOG_SOURCE_PROJECT_ID="datcom-website-dev"
DESTINATION_DATASET="usage_logs_dataset"
DESTINATION_TABLE="test_logger_script"

DESTINATION="bigquery.googleapis.com/projects/${LOG_SOURCE_PROJECT_ID}/datasets/${DESTINATION_DATASET}/tables/${DESTINATION_TABLE}"

# This section is commented out, as it is the first part of the setup.
# gcloud logging sinks create \
#     "${SINK_NAME}" \
#     "${DESTINATION}" \
#     --description="routes usage logs to a bigquery table" \
#     --log-filter="jsonPayload.log_data:*" \
#     --use-partitioned-tables \
#     --project="${LOG_SOURCE_PROJECT_ID}"

# 3. Wait a few minutes until logs appear in the BigQuery table.

# 4. Then add a scheduled query that transfers the entry log to aggregated daily logs.
# Docs: https://cloud.google.com/bigquery/docs/scheduling-queries#bq

# target_dataset: the dataset to pull information from. Should be the same as your log sink destination.
# display_name: the name you want for your scheduled query.
# params: 
#   query: the actual GoogleSQL string to execute.
#   destination_table_name_template: the table to write the query results to.
#   write_disposition: we use WRITE_APPEND (adds new query results to existing table).
#   data_source: "scheduled_query".
SCHEDULED_QUERY_NAME="test script scheduled query"
AGGREGATE_LOG_TABLE_NAME="usage_logs_aggregated"

# Use a here document to define the multi-line query string cleanly.
read -r -d '' AGGREGATE_QUERY_STRING <<EOF
# A daily scheduled query to aggregate logs into a new table.
# This query processes the previous day's logs into one log entry representing all queries that happened during that day

WITH DailyLogs AS (
  -- daily logs unnests the daily logs to make them easier to use later on
  -- we can add a where clause here to only consider logs with a timestamp in the current day
  SELECT
    -- TODO: support feature (just hasn't been pushed to dev!)
    -- T1.jsonPayload.log_data.feature,
    "website" as feature,
    T1.jsonPayload.log_data.place_type,
    statVar.stat_var_dcid AS statVarDCID,
    -- This sets the facet with the same information, but the dates correctly formatted
    STRUCT(
      facet.facet as facet_detail,
      -- accounts for improperly formatted dates (can change this once I finish setting up date support)
      COALESCE(SAFE.PARSE_DATE('%Y', facet.earliest), CURRENT_DATE()) AS earliest,
      COALESCE(SAFE.PARSE_DATE('%Y', facet.latest), CURRENT_DATE()) AS latest,
      COALESCE(facet.count, 0) AS num_entities
    ) AS facet,
    1 AS query_count -- A simple counter for each row/query
  FROM
    \`${LOG_SOURCE_PROJECT_ID}.${DESTINATION_DATASET}.${DESTINATION_TABLE}\` AS T1,
    UNNEST(T1.jsonPayload.log_data.stat_vars) AS statVar,
    UNNEST(statVar.facets) AS facet
),

AggregatedPlaceTypes AS (
  -- This aggregates by place type, so that we can count the number of entities in one nested struct for num queries and num series
  SELECT
    feature,
    statVarDCID,
    -- all of the facet-specific info is stored in the facet, even when it's aggregated
    STRUCT(
      facet_detail,
      SUM(num_entities) AS num_entities,
      -- TODO: separate by num_entiteis per query place here!
      -- ARRAY_AGG(STRUCT(place_type, num_entities) ORDER BY place_type) AS num_entities_by_place_type
      ARRAY_AGG(STRUCT(place_type, query_count) ORDER BY place_type) AS queries_by_place_type,
      --TODO: earliest and latest aggregated here!!!
      MIN(earliest) as earliest,
      MAX(latest) as latest
    ) AS facet
  FROM (
    -- Inner query to count queries for each unique facet/place_type combination.
    SELECT
      feature,
      statVarDCID,
      facet.facet_detail AS facet_detail,
      place_type,
      -- COUNT(1) AS query_count
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
  -- Now, we aggregate by feature and statVar, each pair with a set of all facets used
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

-- This groups stat vars by feature and gives us our final result
SELECT
  PARSE_DATE('%Y-%m-%d', CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) AS STRING)) AS timestamp,
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
EOF

# Use printf to create the properly escaped JSON string. This is the most reliable way to avoid errors.
PARAMS=$(printf '{"query":"%s","destination_table_name_template":"%s","write_disposition":"WRITE_APPEND"}' \
  "${AGGREGATE_QUERY_STRING}" \
  "${AGGREGATE_LOG_TABLE_NAME}")

# Run the final bq mk command to create the scheduled query.
bq mk \
--transfer_config \
--target_dataset="${DESTINATION_DATASET}" \
--display_name="${SCHEDULED_QUERY_NAME}" \
--params="${PARAMS}" \
--data_source="scheduled_query" \
--project_id="${LOG_SOURCE_PROJECT_ID}"












# # 1. Have logs going to stdout in your GCP project

# # 2. Configure a log sink to route logs to a BigQuery table:
# # Docs: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create 

# # destination: be a BigQuery table, e.g. bigquery.googleapis.com/projects/<PROJECT_ID>/datasets/<DATASET_NAME>
# #   Note that the destination BQ table can be in a different GCP project from the project where the logs are written from
# # Log_filter:  an attribute that only your logs have –  give your logs a unique message like “usage_log_data”
# # use-partitioned-tables: tables grouped by day, which reduces storage costs because it only considered data to have been updated by partition, so more data is priced at BigQuery’s lower long-term storage price
# # Project: your GCP project ID for the project where the logs are coming from

# SINK_NAME="testing_script"
# LOG_SOURCE_PROJECT_ID="datcom-website-dev"
# DESTINATION_DATASET="usage_logs_dataset"
# DESTINATION_TABLE="test_logger_script"

# DESTINATION="bigquery.googleapis.com/projects/${LOG_SOURCE_PROJECT_ID}/datasets/${DESTINATION_DATASET}/tables/${DESTINATION_TABLE}"

# # gcloud logging sinks create \
# #     ${SINK_NAME} \
# #     ${DESTINATION_TABLE} \
# #     --description="routes usage logs to a bigquery table" \
# #     --log-filter="jsonPayload.log_data:*" \
# #     --use-partitioned-tables \
# #     --project=$LOG_SOURCE_PROJECT_ID

# # 3. Wait a few minutes until logs appear in BQ table

# # 4. Then add a scheduled query that transfers the entry log to aggregated daily logs
# # Docs: https://cloud.google.com/bigquery/docs/scheduling-queries#bq

# # target_dataset: the dataset to pull information from. Should be the same as your log sink destination!
# # display_name: the name you want for your scheduled query
# # params: 
# #   query: the actual GoogleSQL string to execute
# #   destination_table_name_template: the table to write the query results to
# #   write_disposition: we use WRITE_APPEND (adds new query results to existing table), alternative is WRITE_TRUNCATE
# #        which overwrites what is previously written to the table
# #   data_source: "scheduled_query"
# SCHEDULED_QUERY_NAME="test script scheduled query"
# # AGGREGATE_LOG_TABLE_NAME="bigquery.googleapis.com/projects/datcom-website-dev/datasets/logs_dataset/tables/test_agregate_script"
# AGGREGATE_LOG_TABLE_NAME="usage_logs_aggregated"

# AGGREGATE_QUERY_STRING="# A daily scheduled query to aggregate logs into a new table.
# # This query processes the previous day'\''s logs into one log entry representing all queries that happened during that day

# WITH DailyLogs AS (
#   -- daily logs unnests the daily logs to make them easier to use later on
#   -- we can add a where clause here to only consider logs with a timestamp in the current day
#   SELECT
#     -- TODO: support feature (just hasn'\''t been pushed to dev!)
#     -- T1.jsonPayload.log_data.feature,
#     "website" as feature,
#     T1.jsonPayload.log_data.place_type,
#     statVar.stat_var_dcid AS statVarDCID,
#     -- This sets the facet with the same information, but the dates correctly formatted
#     STRUCT(
#       facet.facet as facet_detail,
#       -- accounts for improperly formatted dates (can change this once I finish setting up date support)
#       COALESCE(SAFE.PARSE_DATE('\''%Y'\'', facet.earliest), CURRENT_DATE()) AS earliest,
#       COALESCE(SAFE.PARSE_DATE('\''%Y'\'', facet.latest), CURRENT_DATE()) AS latest,
#       COALESCE(facet.count, 0) AS num_entities
#     ) AS facet,
#     1 AS query_count -- A simple counter for each row/query
#   FROM
#     `"${LOG_SOURCE_PROJECT_ID}"."${DESTINATION_DATASET}"."${DESTINATION_TABLE}"` AS T1,
#     UNNEST(T1.jsonPayload.log_data.stat_vars) AS statVar,
#     UNNEST(statVar.facets) AS facet
# ),

# AggregatedPlaceTypes AS (
#   -- This aggregates by place type, so that we can count the number of entities in one nested struct for num queries and num series
#   SELECT
#     feature,
#     statVarDCID,
#     -- all of the facet-specific info is stored in the facet, even when it'\''s aggregated
#     STRUCT(
#       facet_detail,
#       SUM(num_entities) AS num_entities,
#       -- TODO: separate by num_entiteis per query place here!
#       -- ARRAY_AGG(STRUCT(place_type, num_entities) ORDER BY place_type) AS num_entities_by_place_type
#       ARRAY_AGG(STRUCT(place_type, query_count) ORDER BY place_type) AS queries_by_place_type,
#       --TODO: earliest and latest aggregated here!!!
#       MIN(earliest) as earliest,
#       MAX(latest) as latest
#     ) AS facet
#   FROM (
#     -- Inner query to count queries for each unique facet/place_type combination.
#     SELECT
#       feature,
#       statVarDCID,
#       facet.facet_detail AS facet_detail,
#       place_type,
#       -- COUNT(1) AS query_count
#       COUNT(query_count) AS query_count,
#       SUM(facet.num_entities) AS num_entities,
#       MIN(facet.earliest) as earliest,
#       MAX(facet.latest) as latest
#     FROM DailyLogs
#     GROUP BY
#       feature,
#       statVarDCID,
#       facet.facet_detail,
#       place_type
#   )
#   GROUP BY
#     feature,
#     statVarDCID,
#     facet_detail
# ),

# AggregatedStatVars AS (
#   -- Now, we aggregate by feature and statVar, each pair with a set of all facets used
#   SELECT
#     feature,
#     statVarDCID,
#     ARRAY_AGG(
#       facet
#     ) AS facets
#   FROM AggregatedPlaceTypes
#   GROUP BY
#     feature,
#     statVarDCID
# )

# -- This groups stat vars by feature and gives us our final result
# SELECT
#   PARSE_DATE('\''%Y-%m-%d'\'', CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) AS STRING)) AS timestamp,
#   feature,
#   ARRAY_AGG(
#       STRUCT(
#         statVarDCID,
#         facets
#       )
#     ) AS stat_vars
# FROM AggregatedStatVars
# GROUP BY
#   feature"


# # PARAMS=$(printf '{"query":"%s","destination_table_name_template":"%s","write_disposition":"WRITE_APPEND"}' "${AGGREGATE_QUERY_STRING}" "${AGGREGATE_LOG_TABLE_NAME}")
# # PARAMS='{"query": "SELECT * FROM test_logger_script.stdout","destination_table_name_template":'"${AGGREGATE_LOG_TABLE_NAME}"',"write_disposition":"WRITE_APPEND"}'
# # PARAMS='{"query": "'"${AGGREGATE_QUERY_STRING}"'", "destination_table_name_template": "test_aggregation_script", "write_disposition":"WRITE_APPEND"}'
# # PARAMS=$(printf '{"query":"%s","destination_table_name_template":"%s","write_disposition":"WRITE_APPEND"}' "${AGGREGATE_QUERY_STRING}" "test_aggregation_script")

# # Create a temporary file and write the query to it
# TEMP_QUERY_FILE=$(mktemp)
# printf '%s' "${AGGREGATE_QUERY_STRING}" > "${TEMP_QUERY_FILE}"

# cat ${TEMP_QUERY_FILE}

# # echo "${PARAMS}"

# bq mk \
# --transfer_config \
# --target_dataset="test_logger_script" \
# --display_name="test script scheduled query" \
# --params="{\"query\":\"`cat ${TEMP_QUERY_FILE}`\", \"destination_table_name_template\":\"${AGGREGATE_LOG_TABLE_NAME}\", \"write_disposition\":\"WRITE_APPEND\"}" \
# --data_source="scheduled_query" \
# --project_id="datcom-website-dev" \

# # The first time you run the command, you receive a message like the following:

# # [URL omitted] Please copy and paste the above URL into your web browser and follow the instructions to retrieve an authentication code.

# # Follow the instructions in the message and paste the authentication code on the command line.