# Data Commons Embeddings Eval

## Produce Eval Golden Data from Explore Landing Pages

```bash
export NODEJS_API_KEY=<api_key_for_bard.datacommons.org>
python3 fetch_explore_queries.py
```

This produces a csv file that can be imported to Google Sheet for further manual
curation to produce golden data for eval purpose.

## Prepare Model and Embedding Endpoints

To evaluate a model and embeddings generated from the model, it needs to be
deployed to Vertex AI. Concrete steps can be found in
[model server](../../../model_server/README.md).

Once a model is deployed, generate embeddings and index them in Vertex AI vector
search. Concreate steps can be found in [build
embeddings](../embeddings/README.md).

Once model and embeddings endpoints are avaiable, record the endpoints id in
`vertex_ai_endpoints.yaml` file.

## Evalutation Unit

One evaluation unit locates in a sub folder that contains a `golden.json` file
that is a mapping between golden query and ranked stat vars to be matched from
the vector store. Note there is logic to get to ranked stat vars from ranked
embedding vectors. Right now it's simply based on the stat vars for a
description embedding. This can be changed in the future. Multiple evalutation
unit could exist for different eval sets (like UNSDG, WHO).

## Run Eval

Choose a model from `vertex_ai_endpoints.yaml` and eval unit folder and run:

```bash
./run.sh -m <model_name> -f <folder>
```

Example commands: `./run.sh -m dc-all-minilm-l6-v2 -f base`

This produces `debug.json` and `report.csv` in the `result` folder of the eval
unit folder.

The `report.csv` contains query and the ndcg score per row. `debug.json`
contains the matched embeddings description, stat var dcid and the cosine score.
