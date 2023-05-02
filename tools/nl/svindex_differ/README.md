## StatVar Embeddings Differ

This is a command-line tool to validate SV index changes for regression.  It
runs a bunch of golden queries (in [queryset.csv](queryset.csv)) against a
`test` index and a `base` index, and reports diffs as an HTML report.

This should be run as part of updating the SV index (following instructions
[here](../embeddings)) to compare that against what's checked-in.  Run it as:

```
./run.sh <embeddings_us_filtered_YYYY_MM_DD_HH_MM_SS.csv>
```

This will produce an html file in `/tmp/differ_report.html`.  Provide that as
part of the PR updating the SV index to a new version.
