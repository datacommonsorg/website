# Detection Evals

This folder contains resources and scripts for evaluation for nl
detection. These are for running experiments evaluation with different
Golden Curation, environment and detectors.

## Prerequisites
1. In the input folder, you need to have golden curation csv file.
2. For evaluating with local runtime, you need to start the local NL server and Flask serve with following commands in website folder:
    - ./run_nl_server.sh
    - ./run_server.sh -m

### Input Structure

In the input CSV file, you need to have a [NlGolden](eval_models.py#L78) type data. It contains below fields.

  - id: This is a unique key to identify the query
  - query: This is the full query string
  - dates: This is the list of dates decided from the golden curation
  - places: This is the list of places decided from the golden curation
  - variables: This is the list of statistical variables decided from the golden curation
  - golden_type: This is the query type indicating stable or aspirational

## Run

```./run.sh [--runtime=] [--detector=] [--golden_path=] [--eval_folder=] [--eval_file_suffix=] [--description=] [--change_log=]```

  - runtime: the flag determining the host to use. Options are: {local|dev|prod}, default to local
  - detector: the flag determining method for detection. Options are: {heuristic|hybrid|llm}, default to hybrid
  - golden_path: the golden curation to evaluate against. Default to ./golden_eval/goldens.csv.
  - eval_folder: the folder to save evaluation output. Default to ./eval_result.
  - eval_file_suffix: the file name suffix to save evaluation output. Default to empty.
  - description: description of the run. Save to summary. Default to empty.
  - change_log: change log to save in summary. Default to empty.
