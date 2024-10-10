# Data Commons Embeddings Eval

## Produce Eval Golden Data from Explore Landing Pages

```bash
export NODEJS_API_KEY=<api key for bard.datacommons.org>
python3 fetch_explore_queries.py
```

This produces a csv file that can be imported to Google Sheet for further manual
curation to produce golden data for eval purpose.

## Prepare Model and Embedding Endpoints

To evaluate a model and embeddings generated from the model, it needs to be
deployed to Vertex AI. Concrete steps can be found in
[model server](../../../model_server/README.md).

Once a model is deployed, generate embeddings and index them in Vertex AI vector
search. Concrete steps can be found in [build
embeddings](../embeddings/README.md).

Once model and embeddings endpoints are avaiable, record the endpoints id in
[vertex_ai_endpoints.yaml](../../../shared/model/vertex_ai_endpoints.yaml) file.

## Setup Eval

To setup a eval, create a sub folder under [shared/eval/](../../../shared/eval/)
that contains a `golden.json` file which maps a query sentence to a list of
ordered stat vars. Note there is a logic to get to ranked stat vars from ranked
descriptions (embeddings). Right now it's simply based on the highest ranked
description of a stat var (which is the logic in NL server). This can be changed
in the future.

Multiple eval could exist for different eval sets (like UNSDG, WHO).

## Run Eval

Choose a model from
[vertex_ai_endpoints.yaml](../../../shared/model/vertex_ai_endpoints.yaml), set
up a eval folder as described above, and run:

```bash
./run.sh -m <model_name> -f <folder_path>
```

Example commands: `./run.sh -m dc-all-minilm-l6-v2 -f <repo_root>/shared/eval/base`

This produces `debug.json` and `report.csv` in a `result` sub folder.

The `report.csv` contains query and the accuracy score per row.
`debug.json` contains the matched embeddings description, stat var dcid and the
cosine score.
