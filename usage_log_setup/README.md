# Usage Logger Setup

These usage logs track what calls are made to mixer and can be used to understand which data sources are most important to viewers.

Ultimately, these logs are ingested by GCP Cloud Logging and are stored in a BigQuery table for easy, long-term access. This setup script uses a GCP Cloud Logging router and BigQuery to route logs written to `stdout` into a BigQuery table. A once-daily BQ Scheduled Query then queries this table to write daily aggregations to a second BigQuery table, which can significantly reduce GCP storage costs over time and better serves the logs' purpose of long-term usage analysis.

The setup process is divided into two scripts because BigQuery can take a minute to begin processing logs after a log router is set up in Cloud Logging. Follow the steps below to configure the usage logger and run the scripts.

---

### Setup Steps

### 1. Have [structured logs](https://docs.cloud.google.com/logging/docs/structured-logging) going to `stdout` from Mixer. These should be visible when running Mixer locally and are written from the existing [`usagelogger`](https://github.com/datacommonsorg/mixer/blob/master/internal/log/usagelogger.go).

GCP Cloud Logging automatically picks up structured logs written to `stdout`. This is true for [Cloud Run jobs](https://cloud.google.com/run/docs/logging) as well as [GKE deployments](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-logs). Check in the "Logging" page in the GCP console of your project to confirm that your logs are reaching GCP.

### 2. Define the GCP projects, datasets, and data tables where you plan to store your logs in `.env`.

Your logs will be stored in a BigQuery table of your choosing that can be in either the same GCP project as your logs or a different one. In the second case, you'll configure a log router in your first project and use a separate `DESTINATION_PROJECT` for the project where you plan to set up BigQuery.

You'll define these project IDs, datasets, and dataset tables in `.env` and they'll be picked up by the scripts below. You also have the option to specify descriptions for these tables and names for the router that will appear on the GCP console.

### 3. Configure [log sinks](https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create) to route logs from Cloud Logging to a BigQuery table by running `create_log_sink.sh`.

This script generates a BigQuery dataset in the GCP project where you plan to store your logs. Then, we create a log sink that routes `stdout` to this dataset for each GCP project that recieves logs.

The log sinks use a log filter you defined in the `config` to recognize usage logs and direct them to a pre-defined BigQuery dataset.

GCP automatically creates a table within the destination dataset and assigns it a schema based on the schema of the first incoming logs. Modifying the log schema later on is usually also automatically reflected in the BigQuery schema.

If you're combining logs from multiple Mixer instances in different GCP projects, this script is configured to use the same dataset as the destination for all of them. This gives you one consolidated log table for all of your instances.

### 4. Wait a few minutes until you can see that the BigQuery destination table has been populated with logs in the GCP console.

GCP will automatically recognize the schema of the incoming logs. This table now stores all raw, query-level logs written by mixer.

### 5. Then, run `schedule_aggregator_query.sh` to [schedule a query](https://cloud.google.com/bigquery/docs/scheduling-queries#bq) on this BigQuery table. This query aggregates these query-level logs into a single daily log in the `AGGREGATION_TABLE` table you defined in the `config`.

This executes the specified SQL query every 24 hours and writes the query results to the aggregated table.

The daily aggregates significantly decrease storage needs. If costs are still a concern, you can also configure a partition expiration on your **query-level** BigQuery table. This allows you to store the sparser daily logs permanently while discarding old query-level logs that have already been accounted for in the daily logs, and is ideal if you plan to use the usage logs for longer-term tracking and don't need query-level granularity. This can be set up by running the following command:

```
bq update \
--time_partitioning_expiration <integer_in_seconds> \
${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}.{DESTINATION_TABLE}
```
