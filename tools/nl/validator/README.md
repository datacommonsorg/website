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
1. Construct a query using the SV desc and place name.
   * Additionally we may include contained-in and ranking queries.
2. In the chart config, check:
   (a) If we have no result
   (b) If we got the place wrong
   (c) What the rank of the SV is in the chart-config
       (i.e., the first chart it shows up in)
3. Produce a CSV with:
   ```
   Query,SV,Place,Exception,EmptyResult,WrongPlace,SVRank
   ```

### Initial Validation

P0: Every result with NoResult, WrongPlace and SVRank infinity.
P1: Every result with >3 SVRank.

### Auto fine-tune

When we add a pile of SVs to the index, run the System Test and find all
existing SVs whose SVRank gets poor.

### Future

* Support child-place-type for contained-in and ranking queries.
* Call for child places (without data) and child place-types (without data)
  to test fallback
