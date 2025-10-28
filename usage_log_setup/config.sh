## Log Sink

# The GCP project where your logs appear
export LOG_SOURCE_PROJECT_ID="datcom-website-prod"
# Name of the log sink that routes usage logs from Cloud Logging to BigQuery
export SINK_NAME="usage_logger"
# A description of the sink, optional
export DESCRIPTION="routes usage logs to a bigquery table"
# An attribute that only your logs have
export LOG_FILTER="jsonPayload.usage_log:*"

## BigQuery

# The dataset where you plan to store your logs raw logs prior to aggregation.
# Note that this can be can be in a different GCP project than the one where your logs are written.
export DESTINATION_PROJECT_ID=${LOG_SOURCE_PROJECT_ID}
# Name of the BigQuery dataset in DESTINATION_PROJECT_ID to route raw logs to
export DESTINATION_DATASET="usage_logs"
# Name of the BigQuery dataset table to store your logs within DESTINATION_DATASET
export DESTINATION_TABLE="query_logs"
# A short description of the BigQuery dataset and table
export DATASET_DESCRIPTION="Dataset to store usage logs from GCP logging"
export TABLE_DESCRIPTION="Table to store usage logs from GCP logging"

## Scheduled Query

# The name of the scheduled query that aggregates query logs to daily logs
export SCHEDULED_QUERY_NAME="test script scheduled query"
# The file in this directory that contains the SQL query that aggregates the logs into daily summaries
export SQL_FILE="./usage_log_setup/aggregation_query.sql"
# The BigQuery table to write aggregated logs to, in the DESTINATION_DATASET with the query-level logs
# Note that this expects that you'll ultimately store your query-level raw logs and daily aggregated logs
# in two tables in the same dataset. 
export AGGREGATION_TABLE="daily_logs"
# Short description of the AGGREGATION_TABLE
export AGGREGATION_TABLE_DESCRIPTION="Generated aggregate daily log for 24 hours of query_logs."

