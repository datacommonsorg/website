## NodeJs Query Differ

This is a commmand line tool to get the diffs between a run of the Nodejs Query
tests (that are run by cronjobs on gke) against golden files and outputs the
diffs in a json that can be saved locally or to gcs.

To run diffs:

```bash
./run.sh -m diff -e <ENV> [-t <TEST_FOLDER> -g <GCS_FOLDER> -f <FAILURE_EMAIL>]
```

- ENV is the environment that the NodeJs Query tests were run in. Default is `autopush`
- TEST_FOLDER is the date in the folder path of the folders containing the results of the NodeJs Query runs to test and to test against. All NodeJs Query test results are saved in [gs://datcom-website-periodic-testing](https://pantheon.corp.google.com/storage/browser/datcom-website-periodic-testing) and the folder path has the form `/<env>/<date>/nodejs_query/`. Default for TEST_FOLDER is the date of the last run.
- GCS_FOLDER is the gcs folder in the folder path of the folders containing the results of the NodeJs Query runs to output the results of the diff to. This will be saved within the bucket [gs://datcom-website-periodic-testing](https://pantheon.corp.google.com/storage/browser/datcom-website-periodic-testing). If not set, results will be output locally.
- FAILURE_EMAIL is the filename for to save an email template when there are diffs found. An email template is one that the [send_email_tool](../../send_email/) can use to send an email. If not set, no email template will be output.

## Update goldens

To update goldens used in the diffs, run:

```bash
./run.sh -m update -e <ENV> [-t <TEST_FOLDER>]
```

- ENV is the environment to update the goldens for. Default is 'autopush'
- TEST_FOLDER is the date in the folder path of the folders containing the results of the NodeJs Query runs to use as the golden set. All NodeJs Query test results are saved in [gs://datcom-website-periodic-testing](https://pantheon.corp.google.com/storage/browser/datcom-website-periodic-testing) and the folder path has the form `/<env>/<date>/nodejs_query/`. Default for TEST_FOLDER is the date of the last run.
