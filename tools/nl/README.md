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

Keep in mind that the descriptions are meant to be compared with natural laguage
queries. They should mimic and reflects real world intent.

On the other hand, the description should reflect the stat var constraints (age,
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
for the given queries. The result is grouped by existing indexes and the curated
descriptions are applied on top of the existing descriptions.

Note:

- "green" rows indicate the curated stat vars from the session.
- "red" rows indicate overrided stat vars from the existing index store.

### Build Embedding Index

Once you are statisfied with the curated stat vars, can use [Build Embeddings
Tool](./embeddings/README.md) to build / update the actual embeddings index.
This would produce and save embeddings file in GCS and readily used by the NL
server.

This step should be follow by checking a large amount of queries and compare the
stat var matches against the behavior of "prod". This can be done by running the
[SV Index Differ](./svindex_differ/README.md) tool. This produces a report html
file that lists the difference of matched stat vars for hundreds of test queries.

### Submit Changes

Send the following changes for code review in one PR

- New / updated description csv file
- Updated `_preindex.csv`
- Updated [catalog.yaml](../../deploy/nl/catalog.yaml)
- SV index differ report html file link
- Updated integration golden files (by running `./run_test.sh -g` from repo
  root)
