## StatVar Embeddings Differ

This is a command-line tool to compare two variable embeddings indexes.
Such an index is made up of a model + store identified in `embeddings.yaml`.
With this tool, you can run a diff between two indexes where the model and/or
store may vary.

The tool runs a bunch of golden queries (in [queryset.csv](queryset.csv))
against a `test_index` and a `base_index`, and reports diffs in an HTML
report that is saved in [gs://datcom-embedding-diffs](https://pantheon.corp.google.com/storage/browser/datcom-embedding-diffs).

If you are using the tool in the context of updating the embeddings store, as
the first step, produce a new store following instructions
[here](../embeddings).  Then, update the local `embeddings.yaml` file with
the new SV index path.

Note that it needs the autopush Mixer API key.

### Run the tool

To compare `medium_ft` on 

```
export AUTOPUSH_KEY=<XYZ>
./run.sh (medium_ft | undata_ft | ...)
```

Please ensure any diffs are expected/understood, and attach the report to the
PR updating the SV index.

Note that `medium_ft` refers to the current PROD embeddings index.
