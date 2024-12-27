# Tools Related to Natural Language Query in Data Commons

## Curate Stat Var Descriptions

### Input File Structure

Statistical variables and topics descriptions used for building sentence
embeddings are stored in [embeddings/input](./embeddings/input/), where each sub
folder represents one "embedding index". An embedding index represents a set of
stat vars / topics and their descriptions that are used together for vector
match of a query sentence. For example
[embeddings/input/base](./embeddings/input/base/) contains the stat var
description input csv files of all base Data Commons stat vars and topics.

Each stat var description input CSV contains two columns:

- dcid: The stat var/ topic DCID
- setence: A set of descriptions of the dcid, concatenated by ";"

### Curate Description

In a nutshell, the stat var description should be "precise" and "consise". It
should accurately articulate the meaning of the stat vars with no ambiguity, and
should be consise without too much unwanted contexts.

Keep in mind that the descriptions are meant to be compared with natural
language queries. They should mimic and reflects real world intent.

Additionally, the description should reflect the stat var constraints (age,
time range etc) so it can be distinguished from other similar stat vars.

## Test and Validate Description

### Embedding Eval Playground

To add (update) a small amount of stat var descripitions and test against some
sample queries, use the [embeddings eval
tool](https://autopush.datacommons.org/nl/eval/embeddings).

- Enter or upload the interested queries

- Enter or upload the curated stat var description in the format as mentioned
  above

After clicking on "Apply" from each step, you can check the matched stat vars
for the given queries. The result is grouped by index names. If a stat var
already exists in the index, the curated description would replace the existing
descriptions for embedding matching.

Note:

- "green" rows indicate the curated stat vars from the session.
- "red" rows indicate overriden stat vars from the existing index store.

### Build Embedding Index

Once you are satisfied with the curated stat vars, use [Build Embeddings
Tool](./embeddings/README.md) to build or update the actual embeddings index.
This will produce an embeddings file in GCS and the path gets printed out to the
console. Updating [catalog.yaml](../../deploy/nl/catalog.yaml) with that path
makes the NL server use the new embeddings.

### SV Index Differ

Once the new embeddings are generated, run the [SV Index
Differ](./svindex_differ/README.md) to produce an html report of diffs. These
are differences in the variable matches when comparing the new embeddings
against "prod" for a few hundred golden queries. Go over the diffs and make
further tweaks as necessary.

### Submit Changes

Send the following changes for code review in one PR

- Update stat var description csv file, for example
  [sheets_svs.csv](./embeddings/input/base/sheets_svs.csv)
- Updated `_preindex.csv` from "Build Embedding Index" step
- Updated [catalog.yaml](../../deploy/nl/catalog.yaml)
- SV index differ report html file link
- Updated integration golden files (by running `./run_test.sh -g` from repo
  root)
