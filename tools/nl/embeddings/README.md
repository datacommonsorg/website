# Tools and Data for Stat Var Embeddings Index

This directory contains the data CSV (containing StatVar DCID and
descriptions) and script used to construct the stat var embeddings index that
is loaded into the NL Server.

There are multiple embeddings index types. Each index holds the stat var
descriptions for a particular domain or use case. The input stat var
description csvs for one index type are saved in one folder under `input/`.

## Embeddings Index Config

Embeddings index is configured in
[`catalog.yaml`](../../../deploy/nl/catalog.yaml), under `indexes` field. The
keys are index names (specified as `idx=` param value). Each value contains the
following fields:

- `store_type`: what type of embeddings store? (MEMORY, LANCEDB, VERTEXAI)
- `model`: the name of the associated model from `models` section
- `embeddings_path`: For MEMORY/LANCEDB, the path to the index files. Can be a
  local absolute path or GCS (gs://) path.
- `source_path`: the input csv folder path.

### Create New Index Config

To create a new index type, add an entry under `indexes`, fill in `store_type`,
`model`, `source_path`. This is sufficient to build the index as indicated in
the steps below.

## Input CSV Format

Curated stat var and topics description should be saved in csv files. Each csv
file should have two columns:

- `dcid`: the StatVar DCID.
- `sentence`: the description(s) of the StatVar. Multiple descriptions are
  acceptable. If multiple description strings are provided, they must be
  semi-colon delimited.

## Update Stat Var Descriptions

To easily edit the curated csv in Google sheets, you can go use the sheets
command-line tools [here](../../sheets/).

- E.g., To copy the curated input for the base embeddings to a google sheet, go
  to the sheets command line tools folder and run:

  ```bash
  ./run.sh -m csv2sheet -l ../nl/embeddings/input/base/sheets_svs.csv [-s <sheets_url>] [-w <worksheet_name>]
  ```

- E.g., To copy the contents of the google sheet back as the curated input for
  the base embeddings, go to the sheets command line tools folder and run:

  ```bash
  ./run.sh -m sheet2csv -l ../nl/embeddings/input/base/sheets_svs.csv -s <sheets_url> -w <worksheet_name>
  ```

## Build Embeddings Index

Identify the index name from [catalog.yaml](../../../deploy/nl/catalog.yaml),
within `indexes`. If the index is newly created, add a new entry as described
above.

Run the command below which will generate a new embeddings csv in
`gs://datcom-nl-models`. Note down the embeddings file version printed at the
end of the run.

```bash
./run.sh --embeddings_name <EMBEDDINGS_NAME>
```

Available options for <EMBEDDINGS_NAME> are:

- sdg_ft
- undata_ft
- undata_ilo_ft
- bio_ft
- uae_base_mem

## Validate Embeddings Index

1. Validate the CSV diffs, update
   [`catalog.yaml`](../../../deploy/nl/catalog.yaml) with the generated
   embeddings path and test out locally.

1. Generate an SV embeddings differ report by following the process under the
   [`sv_index_differ`](../svindex_differ/README.md) folder. Look
   at the diffs and evaluate whether they make sense.

1. Update goldens by running `./run_test.sh -g` from the repo root.

1. If everything looks good, send out a PR with the `catalog.yaml`, the
   `differ_report.html` file (as a linked attachement), CSV changes, and updated
   goldens.
