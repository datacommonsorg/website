# NL Dashboard

We have [Looker Studio](https://lookerstudio.google.com/) based dashboards
that allow drilling down into stats on queries:
* [Main DC
  Dashboard](https://lookerstudio.google.com/c/u/0/reporting/0fbd2bf9-3e85-48e2-95f8-bb880f087d27/page/p_0zw216uvad)
* [UNSDG
  Dashboard](https://lookerstudio.google.com/c/reporting/ba70ded9-dde3-4c9d-9862-440025e3d081/page/dVqcD)

We add the `nl-query` BT table, where the queries get logged, as a BQ table.
On top of that, a few [scheduled
queries](https://pantheon.corp.google.com/bigquery/scheduled-queries?mods=-monitoring_api_staging&project=datcom-store)
run nightly to produce 3 tables:

* Query table
* Query count table
* User Feedback table (since feedback is linked to a chart)

These tables are then directly loaded into the dashboards above.

Below are SQL snippets for recreating the setup.

In case of enabling dashboards for new custom DCs, replace
`datcom-website-prod` in the queries with the custom DC's GCP project.

TODO: Automate the instructions below with a script that uses `bq query --schedule`.


## Adding BT as an external BQ table

As a one-time thing, run this query on the BQ UI.

```
CREATE OR REPLACE EXTERNAL TABLE dc_dashboard.nl_query_log
OPTIONS (
  format = 'CLOUD_BIGTABLE',
  uris = ['https://googleapis.com/bigtable/projects/datcom-store/instances/website-data/tables/nl-query'],
  bigtable_options =
    """
    {
      columnFamilies: [
        {
          "familyId": "all",
          "onlyReadLatest": "false",
          "columns": [
            {
              "qualifierString": "project",
              "type": "STRING"
            },
            {
              "qualifierString": "version",
              "type": "STRING"
            },
            {
              "qualifierString": "session_info",
              "type": "STRING"
            },
            {
              "qualifierString": "data",
              "type": "STRING"
            },
            {
              "qualifierString": "feedback",
              "type": "STRING"
            }
          ]
        }
      ],
      readRowkeyAsString: true
    }
    """
);
```

## Generating Query Table

Follow instructions [here](https://cloud.google.com/bigquery/docs/scheduling-queries#set_up_scheduled_queries) to set up this query as a BQ Scheduled query, run daily.

```
CREATE OR REPLACE TABLE `datcom-store.dc_dashboard.nl_queries_all` AS
SELECT
   rowkey AS SessionId,
   FORMAT_TIMESTAMP('%Y-%m-%d', D.timestamp, "America/Los_Angeles") AS Day,
   FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', D.timestamp, "America/Los_Angeles") AS Time,
   SAFE.STRING(SAFE.PARSE_JSON(D.value)['debug']['original_query']) AS Query,
   SAFE.STRING(SAFE.PARSE_JSON(D.value)['debug']['detection_type']) AS Detection,
   ARRAY_TO_STRING(CAST(JSON_VALUE_ARRAY(SAFE.PARSE_JSON(D.value), '$.userMessages') AS ARRAY<STRING>), ' ; ') AS UserMsg,
   SAFE.STRING(SAFE.PARSE_JSON(D.value)['failure']) AS Failure,
   SAFE.BOOL(SAFE.PARSE_JSON(D.value)['blocked']) AS Blocked,
FROM `datcom-store.dc_dashboard.nl_query_log` AS NL
JOIN NL.all.data.cell AS D
WHERE
  rowkey LIKE '%explore#datcom-website-prod' AND
  SAFE.STRING(SAFE.PARSE_JSON(D.value)['test']) IS NULL
```

## Generating Query Counts Table

Follow instructions [here](https://cloud.google.com/bigquery/docs/scheduling-queries#set_up_scheduled_queries) to set up this query as a BQ Scheduled query, run daily.

```
CREATE OR REPLACE TABLE `datcom-store.dc_dashboard.nl_query_counts` AS
SELECT
   FORMAT_TIMESTAMP('%Y-%m-%d', D.timestamp, "America/Los_Angeles") AS Time,
   COUNT(DISTINCT rowkey) AS NumSession,
   COUNT(SAFE.STRING(SAFE.PARSE_JSON(D.value)['debug']['original_query'])) AS NumQuery
FROM `datcom-store.dc_dashboard.nl_query_log` AS NL
JOIN NL.all.data.cell AS D
WHERE
  rowkey LIKE '%explore#datcom-website-prod' AND
  SAFE.STRING(SAFE.PARSE_JSON(D.value)['test']) IS NULL AND
  SAFE.STRING(SAFE.PARSE_JSON(D.value)['debug']['original_query']) IS NOT NULL
GROUP BY Time
ORDER BY Time
```

## Generating User Feedback Table

Follow instructions [here](https://cloud.google.com/bigquery/docs/scheduling-queries#set_up_scheduled_queries) to set up this query as a BQ Scheduled query, run daily.

```
CREATE OR REPLACE TABLE `datcom-store.dc_dashboard.nl_query_feedback_all` AS
SELECT
   rowkey AS SessionId,
   FORMAT_TIMESTAMP('%Y-%m-%d', F.timestamp, "America/Los_Angeles") AS Day,
   FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', F.timestamp, "America/Los_Angeles") AS Time,
   SAFE.STRING(SAFE.PARSE_JSON(F.value)['sentiment']) AS Sentiment,
   SAFE.STRING(SAFE.PARSE_JSON(F.value)['comment']) AS Comment
FROM `datcom-store.dc_dashboard.nl_query_log` AS NL
JOIN NL.all.feedback.cell AS F
WHERE
  rowkey LIKE '%explore#datcom-website-prod'
```