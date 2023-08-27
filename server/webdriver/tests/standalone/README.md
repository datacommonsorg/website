# Data Commons WebDriver Standalone Tests

The tests in this folder are not unit tests but standalone tests that are run against the dev or prod website deployments.

## Sanity Test (sanity.py)

This test crawls the home, explore landing and explore pages recursively and performs a sanity test on these pages. The output is produced as a CSV in the `output` folder. The output CSV file is named `results-<timestamp>.csv`.

This test can be run in 3 modes as follows:

### `--mode=home`

```shell
python3 sanity.py --mode=home --url=https://dev.datacommons.org
```

Runs the sanity test on the home page, on all explore landing pages and 2 levels of explore pages.

### `--mode=explore_landing`

```shell
python3 sanity.py --mode=explore_landing --url=https://dev.datacommons.org/explore/economics
```

Runs the sanity test on the specified explore landing page and 2 levels of explore pages.

### `--mode=explore`

```shell
python3 sanity.py --mode=explore_landing --url=https://dev.datacommons.org/explore/economics
```

Runs the sanity test on the specified explore explore page.