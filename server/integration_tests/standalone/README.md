# Data Commons Standalone Integration Tests

The tests in this folder are standalone tests that are run against the dev or prod website deployments.

## Adversarial Test (adversarial.py)

This test invokes the DC `detect-and-fulfill` API for adversarial queries specified in various input TSV files. It persists the results generated in output CSV files and also generates reports for queries that produced results for further inspection.

* The input TSVs are looked up by default in a child folder (relative to where the program is run) named `input` (use the `--input_dir` flag to override).
* The output result CSVs are persisted by default in a child folder (relative to where the program is run) named `output` (use the `--output_dir` flag to override).
* The generated reports are persisted in a `reports` folder under the output folder.
* The API by default is invoked on `https://dev.datacommons.org` by default (use the `--base_url` flag to override).
* Use the flag `dc` to switch between the `main` and `sdg` experiences (index, detection, fulfillment).

Specify the `--help` flag to see full usage:

```shell
python3 adversarial.py --help
```

This test can be run in the following modes: 

### `--mode=run_all`

```shell
python3 adversarial.py --mode=run_all
```

Runs the adversarial test on all TSV files in the input directory and persists results and reports (CSVs) in the output directory.

### `--mode=run_queries`

```shell
python3 adversarial.py --mode=run_queries
```

Runs the adversarial test on all TSV files in the input directory and persists results in the output directory. Reports are not generated in this mode.

### `--mode=run_query`

```shell
python3 adversarial.py --mode=run_query --query="my adversarial query"
```

Runs the adversarial test on a single query and outputs the result to console. This mode is useful as a quick test to specific queries (typically during development).

### `--mode=generate_reports`

```shell
python3 adversarial.py --mode=generate_reports
```

Generates and persists reports and stats from results files previously generated.

### `--mode=compute_file_stats`

```shell
python3 adversarial.py --mode=compute_file_stats --results_csv_file=output/my-results.csv
```

Computes stats for a single results file and outputs them to console. This mode is useful to get a quick summary on results of sample queries. 

## Main vs SDG experiences 

Use the `--dc` parameter to invoke the main or SDG experience for detection + fulfullment, e.g.

### `--dc=main`
```shell
python3 adversarial.py --mode=run_all --dc=main
```

Note that leaving the `dc` flag to be empty will also default to the `--dc=main` behavior.

### `--dc=sdg`
```shell
python3 adversarial.py --mode=run_all --dc=sdg
```

## NodeJs Query Test (nodejs_query.py)

This test invokes the NodeJs `query` API and persists the results in output json files.

* The output result jsons are persisted by default in a child folder (relative to where the program is run) named `output` (use the `--output_dir` flag to override).
* The API by default is invoked on `https://dev.datacommons.org` by default (use the `--base_url` flag to override).
* This test is run in gke by a cronjob.
