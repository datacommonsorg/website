# Name of the log sink that routes usage logs from Cloud Logging to BigQuery
export SINK_NAME="usage-logs-to-bq"

# The project that logs are written to
export LOG_SOURCE_PROJECT_ID="datcom-website-autopush"
# A short description of the BigQuery dataset and table
export DATASET_DESCRIPTION="Dataset to store usage logs from GCP logging"
export TABLE_DESCRIPTION="Table to store usage logs from GCP logging"
# Note that the destination BQ dataset can be in a different GCP project from the project where the logs are written from.
export DESTINATION_PROJECT_ID=${LOG_SOURCE_PROJECT_ID}
# Name of the BigQuery dataset to route logs to
# TODO: move to usage_logs once perms are updated
export DESTINATION_DATASET="manual_usage_logs"
# Name of the BigQuery dataset table
# TODO: change to query_logs once perms are updated
export DESTINATION_TABLE="stdout"
# A description of the sink, optional
export DESCRIPTION="routes usage logs to a bigquery table"
# An attribute that only your logs have
export LOG_FILTER="jsonPayload.usage_log:*"

# The name of the scheduled query that aggregates query logs to daily logs
export SCHEDULED_QUERY_NAME="test script scheduled query"
# The BigQuery table to write aggregated logs to, in the DESTINATION_DATASET with the query-level logs
export AGGREGATION_TABLE="daily_logs"
# The file in this directory that contains the SQL query to run
export SQL_FILE="./usage_log_setup/aggregation_query.sql"
# Short description of the AGGREGATE_DESTINATION_TABLE
export AGGREGATION_TABLE_DESCRIPTION="Generated aggregate daily log for 24 hours of query_logs."