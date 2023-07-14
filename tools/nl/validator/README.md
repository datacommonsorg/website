# NL Validator Tool

## Overview

### Bootstrap

For every SV in the index and an associated place with data, get SV
name/description and generate M alternate PaLM descriptions.

This produces a CSV with:

```
SV,PlaceType,Place,SVDesc,PlaceName
```

### System Test

For every row of the above CSV:
1. We construct a query using the SV desc and place name.
   * Additionally we may include contained-in and ranking queries.
2. In the chart config, check:
   * If we have no result
   * If we got the place wrong
   * What the rank of the SV is in the chart-config
     (the first chart it shows up in)
   * What the rank of the SV in the embedding results
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

This will keep checkpointing counters and full results to `cache/
