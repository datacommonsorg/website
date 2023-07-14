# NL Validator Tool

## Overview

### Bootstrap

For every SV in the index and an associated place with data, get SV
name/description and generate M alternate PaLM descriptions.

This produces a CSV with:

```
SV,PlaceType,Place,SVDesc,PlaceName
```

TODO: Add PaLM alt support

### System Test

For every row of the above CSV:
1. We construct a query using the SV desc and place name, and hit
   `dev.datacommons.org`.
2. Check the results for:
   * If we have chart-config
   * If we got the place wrong
   * the rank of the SV is in the chart-config (i.e., first chart with it)
   * the rank of the SV in the embedding results
3. Produce a CSV with and some associated counters:
   ```
   Query,SV,Place,Exception,EmptyResult,WrongPlace,ChartSVRank,EmbeddingSVRank
   ```

### Baseline Validation

TODO: fleshout

P0: Every result with NoResult, WrongPlace and xSVRank infinity.
P1: Every result with >3 SVRank.

### Regression and Auto fine-tuning

TODO: flesh out details

When we add a pile of SVs to the index, run the System Test and find all
existing SVs whose SVRank gets poor...


### Future

* Support child-place-type for contained-in and ranking queries.
* Call for child places (without data) and child place-types (without data)
  to test fallback

## Usage

The test takes a few hours to run, but checkpoints state every N entries, so
be sure to run with a specific `run_name` and use that for all such runs.

```
./systest.sh <RUN_NAME>
```

This will keep checkpointing counters and full results to `checkpoint/`
