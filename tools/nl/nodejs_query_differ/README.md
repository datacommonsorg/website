## NodeJs Query Differ

This is a commmand line tool to get the diffs between two different runs of
the Nodejs Query tests (that are run by cronjobs on gke) and outputs the diffs
in a json that is saved locally.

To run this:

```bash
./run.sh -e <ENV> -b <BASE_FOLDER> -t <TEST_FOLDER>
```

- ENV is the environment that the NodeJs Query tests were run in. Default is `autopush`
- BASE_FOLDER and TEST_FOLDER are the dates in the folder path of the folders containing the results of the NodeJs Query runs to test and to test against. All NodeJs Query test results are saved in [gs://datcom-website-periodic-testing](https://pantheon.corp.google.com/storage/browser/datcom-website-periodic-testing) and the folder path has the form `/<env>/<date>/nodejs_query/`. Default for BASE_FOLDER is the date of the 2nd last run and default for TEST_FOLDER is the date of the last run.


## Update goldens

### Fetch goldens

To get new goldens and save it locally (to easily see the diffs between the new and old goldens), you can run:

```bash
./update_goldens.sh -m fetch -e <ENV> [-g <GOLDEN_FOLDER>]
```

- ENV is the environment to update the goldens for. Default is 'autopush'
- GOLDEN_FOLDER is the date in the folder path of the folders containing the results of the NodeJs Query runs to use the results as the golden set. All NodeJs Query test results are saved in [gs://datcom-website-periodic-testing](https://pantheon.corp.google.com/storage/browser/datcom-website-periodic-testing) and the folder path has the form `/<env>/<date>/nodejs_query/`. Default for GOLDEN_FOLDER is the date of the last run.

### Push goldens

To push the new goldens that have been saved locally to gcs (The differ runs diffs against the gcs goldens), you can run:

```bash
./update_goldens.sh -m push -e <ENV>
```

- ENV is the environment to update the goldens for. Default is 'autopush'