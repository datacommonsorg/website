# Data Commons WebDriver Standalone Tests

The tests in this folder are not unit tests but standalone tests that are run against the dev or prod website deployments.

## Sanity Test (sanity.py)

This test crawls the home, explore landing and explore pages recursively and performs a sanity test on these pages. The output is produced as a CSV in the `output` folder. The output CSV file is named `results-<timestamp>.csv`.

The following sanity checks are performed based on type of page:

> Update this list as checks are added, updated or removed.

* Home:
  + Explore Landing cards are present.
  + Explore landing titles and URLs are present.

* Explore Landing:
  + Topics are present.
  + Queries are present.

* Explore:
  + Charts are present.
  + Placeholder map isn't the only chart present.
  + (Warning) Topic section with no relevant topics.

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
python3 sanity.py --mode=explore --url=https://dev.datacommons.org/explore/#q=How+do+solar+installations+correlate+with+median+income+across+US+counties
```

Runs the sanity test on the specified explore page.

## SDG Sanity Test (sdg_sanity.py)

This test crawls the SDG home and country / region pages. On each country / region page, it clicks through and sanity checks the first 5 goals on the page.

The output is produced as a CSV in the `output` folder. The output CSV file is named `sdg_results_<datetime-str>.csv`.

The default base URL used by the tests is: `https://datcom-un.ue.r.appspot.com`. This can be overriden with the `--base_url` flag.

The following sanity checks are performed based on type of page:

> Update this list as checks are added, updated or removed.

* Home:
  + Goals are present.
  + Search box is present.
  + Countries dropdown is not empty.

* Country / Region:
  + Goal cards are present.
  + Cards have titles.
  + Click up to 5 goals and visit the country / region page for each of those goals.

This test can be run in the following modes:

### `--mode=all`

```shell
python3 sdg_sanity.py --mode=all
```

Runs the sanity test on the home page, on all country / region pages and up to 5 goals for each country / region.

### `--mode=country`

```shell
python3 sdg_sanity.py --mode=country --country_dcid="country/USA"
```

Runs the sanity test on the specified country / region page and up to 5 goals for that country / region.