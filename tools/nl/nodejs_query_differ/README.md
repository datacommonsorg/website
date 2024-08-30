# NodeJs Query Differ

NodeJs Query test runs as cron jobs on GKE. Each run produces a set of json
files. These results are saved in GCS bucket
[gs://datcom-website-periodic-testing](https://pantheon.corp.google.com/storage/browser/datcom-website-periodic-testing)
and the folder path has the form `/<ENV>/<DATE>/nodejs_query/`.

Note `<ENV>` and `<DATE>` are used as arguments in commands below.

## Update Goldens

For each environment that we have goldens for, we pick result from a "golden" run and save that in the [goldens](./goldens/) sub
folder. To do this, run:

```bash
./run.sh -m update
```


## Run Diffs

To get the diffs between one NodeJs Query run and the golden result as mentioned
above, run:

```bash
./run.sh -m diff -e <ENV> [-t <DATE> -g <GCS_FOLDER> -f <FAILURE_EMAIL>]
```

This commands outputs the diffs in a json that can be saved locally or to GCS.

- <ENV> defaults to `autopush`
- <DATE> defaults to the date of the latest run.
- <GCS_FOLDER> defaults to `/<ENV>/<DATE>/nodejs_query/`. If not set, results will be output locally.
- <FAILURE_EMAIL> is the filename for to save an email template when there are
  diffs found. An email template is one that the
  [send_email_tool](../../send_email/) can use to send an email. If not set, no
  email template will be output.
