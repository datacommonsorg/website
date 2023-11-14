# NL Validator Tool

This directory contains tools to issue queries against production
NL services and collect statistics for quality, regression and stat-var fine-tuning.

## Overview

### Bootstrap

For every SV in the medium index and an associated place with data,
get SV name/description and generate M alternate PaLM descriptions.

This produces CSV `llm_output.csv` input to the main tools with header:

```
SV,PlaceType,Place,SVDesc,PlaceName
```

#### Usage

To generate this input:

1. Run `./bootstrap.sh` to generate `llm_input.csv`

2. Use PaLM Alternatives generation script that takes `llm_input.csv`
   as input to generate `llm_output.csv` as output.


### NL System Test

This targets the NL data endpoint and validates the output chart config
that determines the charts shown to the user.

For every row of the above CSV:
1. Construct a query using the SV desc and place name, and hit
   `dev.datacommons.org`.
2. Check the results on:
   * If we have chart-config
   * If we got the place wrong
   * the rank of the SV is in the chart-config (i.e., first chart with it)
   * the rank of the SV in the embedding results
3. Produce a CSV with and some associated counters:
   ```
   Query,SV,Place,Exception,EmptyResult,WrongPlace,ChartSVRank,EmbeddingSVRank
   ```

#### Usage

The test takes a few hours to run, but checkpoints state every N entries, so
be sure to run with a specific `run_name` and use that for re-runs.

```
./systest.sh <RUN_NAME>
```

This will keep checkpointing counters and full results to `checkpoint/`

### Place Recognition Test

This targets the place recognition recon service with the PaLM generated
queries.

For every row of the above CSV:
1. Construct a query using the SV desc and place name, and hit
   PROD mixer endpoint.
2. Check the results on:
   * If we mapped to a place.
   * If we got the place wrong.
   * If we got additional bogus places.
3. Produce a CSV and associated counters in a json.

#### Usage

The test takes 20-30 mins to run, but checkpoints state every N entries, so
be sure to run with a specific `run_name` and use that for re-runs.

Note that it needs the autopush Mixer API key.

```
export AUTOPUSH_KEY=<XYZ>
./placetest.sh <RUN_NAME>
```

This will keep checkpointing counters and full results to `checkpoint/`

### Variable Test

This targets just the variable detection, and is just a faster version of the
e2e NL test.

#### Usage

The test takes 10-15 mins to run, but checkpoints state every N entries, so
be sure to run with a specific `run_name` and use that for re-runs.

First, start the NL server in `opt` mode, as follows.

```
./run_nl_server.sh opt
```

Next, in another window, run the `vartest`.

```
./vartest.sh <RUN_NAME>
```

This will keep checkpointing counters and full results to `checkpoint/`

### Baseline Validation

TODO: flesh out details

P0 - Every result with NoResult, WrongPlace and xSVRank infinity.
P1 - Every result with >3 SVRank.

### Regression and Auto fine-tuning

TODO: flesh out details

When we add a pile of SVs to the index, run the System Test and find all
existing SVs whose SVRank gets poor...


### Future

* Support child-place-type for contained-in and ranking queries.
* Call for child places (without data) and child place-types (without data)
  to test fallback
