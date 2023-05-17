## StatVar Embeddings Differ

This is a command-line tool to validate SV index changes for regression.  It
runs a bunch of golden queries (in [queryset.csv](queryset.csv)) against a
`test` index and a `base` index, and reports diffs in an HTML report.

This should be run, as below, while updating the SV index (following
instructions [here](../embeddings)) to compare against the version
currently checked-in:

```
./run.sh <embeddings_curated_merged_alternatives_YYYY_MM_DD_HH_MM_SS.csv>
```

This will produce an html file with diffs (if any) in `/tmp/differ_report.html`.
Please ensure any diffs are expected/understood, and attach the report to
the PR updating the SV index.

NOTE: The tool assumes that the base and prod has embeddings generated from the
same ML model.
