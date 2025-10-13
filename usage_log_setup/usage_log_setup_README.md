--- Usage Log Setup Script ---

1. Have logs going to stdout from Mixer. These should be recieved in a log router in the same project that's hosting your Mixer (datcom-website and datcom-mixer if running Mixer in both)

2. Configure a log sink to route logs to a BigQuery table:
   Docs: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
   Script: `log_sink.sh`

   This uses a log filter to recognize usage logs and directs them to a pre-defined BigQuery dataset. GCP automatically creates a table within the dataset and assigns it a schema based on the schema of the first incoming logs. Modifying the log schema later on is usually also automatically reflected in the BigQuery schema.

   If you're combining logs from multiple Mixers in different projects, configure a sink in each project, but use the same dataset as the destination for both. Cloud Logging supports routing logs to BigQuery tables in other projects.

3. Wait a few minutes until you can see the BigQuery table with logs in the GCP console.

4. Then add a scheduled query that transfers the entry log to aggregated daily logs to the BigQuery table.
   Docs: https://cloud.google.com/bigquery/docs/scheduling-queries#bq
   Script: `scheduled_query.sh`

   This performs a SQL query at a regular interval that aggregates the query-level logs into a single daily log.

After these steps, you'll have a log router in each GCP project that recieves logs, and a single dataset with logs from all projects. This dataset will have two tables -- one with raw query-level logs from the router, and another with the daily logs that are produced from the scheduled query. This aggregated table is what we use to generate reports -- you can directly query it in BigQuery or set up dashboards with BigQuery's built-in Looker Studio integration.
