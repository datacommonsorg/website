## NodeJs Query Differ

This is a commmand line tool to get the diffs between two different runs of
the Nodejs Query tests (that are run by cronjobs on gke) and outputs the diffs
in a json that is saved locally.

To run this:

```
./run.sh -e <ENV> -b <BASE_FOLDER> -t <TEST_FOLDER>
```

- ENV is the environment that the NodeJs Query tests were run in
- BASE_FOLDER and TEST_FOLDER are the dates in the folder path of the folders containing the results of the NodeJs Query runs to test and to test against. All NodeJs Query test results are saved in [gs://datcom-website-periodic-testing](https://pantheon.corp.google.com/storage/browser/datcom-website-periodic-testing) and the folder path has the form `/<env>/<date>/nodejs_query/`