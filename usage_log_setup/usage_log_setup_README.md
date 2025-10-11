--- Usage Log Setup Script ---

1. Have logs going to stdout in your GCP project.

2. Configure a log sink to route logs to a BigQuery table:
   Docs: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
   Script: `log_sink.sh`

3. Wait a few minutes until logs appear in the BigQuery table.

4. Then add a scheduled query that transfers the entry log to aggregated daily logs.
   Docs: https://cloud.google.com/bigquery/docs/scheduling-queries#bq
   Script: `scheduled_query.sh`

Mention final shape -- one project with a query_logs and daily_logs table
