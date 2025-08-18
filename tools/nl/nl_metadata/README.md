# Statistical Variable Metadata Generation

This directory contains scripts to generate rich metadata and alternative sentences for Data Commons Statistical Variables (StatVars). The primary script, `add_metadata.py`, fetches StatVar metadata, optionally uses the Gemini API to generate alternative natural language sentences, and exports the results to JSONL files.

These generated files are intended to be used as a data source for a Vertex AI Search application to power natural language search over statistical variables.

## Setup

### 1. Environment Variables

Before running the scripts, you need to set up your API keys.

1.  Copy the sample environment file:
    ```bash
    cp .env.sample .env
    ```
2.  Edit the newly created `.env` file and add your API keys:
    *   `DC_API_KEY`: Your Data Commons API key.
    *   `GEMINI_API_KEY`: A single Gemini API key, used for local runs.
    *   `GEMINI_API_KEYS`: A comma-separated list of Gemini API keys, used for parallelized Cloud Run jobs (`run_add_metadata.py`).

### 2. GCP Authentication

You need to be authenticated with the Google Cloud SDK to run the scripts, especially for interacting with GCS, BigQuery, and Cloud Run.

1.  Log in with your GCP account:
    ```bash
    gcloud auth login
    ```
2.  Set the correct project. The scripts are configured to use `datcom-website-dev` for deploying Cloud Run jobs and `datcom-nl` for accessing the Vertex AI search app.
    ```bash
    gcloud config set project datcom-website-dev
    ```

## Running the Script

There are two primary ways to run the metadata generation process: locally for small-scale tests or via a Cloud Run job for large-scale production runs.

### Local Execution (for testing)

You can run `add_metadata.py` directly to process a small number of StatVars. This is useful for testing and debugging.

```bash
python3 add_metadata.py [FLAGS]
```

**Common Flags:**

*   `--generateAltSentences`: (Optional) If present, the script will call the Gemini API to generate alternative sentences.
*   `--useBigQuery`: (Optional) Pull all StatVars from the BigQuery `datcom-store.dc_kg_latest.StatisticalVariable` table. If omitted, it processes a smaller, curated list of StatVars used for NL search.
*   `--maxStatVars=<NUMBER>`: (Optional) Limits the number of StatVars to process. Useful for quick tests.
*   `--useGCS`: (Optional) Saves the output files to a GCS bucket instead of the local filesystem.
*   `--failedAttemptsPath=<PATH>`: (Optional) Re-process a file or folder of previously failed metadata generation attempts.

### Cloud Run Execution (for production)

For processing the entire set of StatVars from BigQuery, the recommended approach is to use the `run_add_metadata.py` script. This script triggers a `stat-var-metadata-generator` Cloud Run job, which runs the `add_metadata.py` script in a containerized environment.

The script will automatically partition the workload across the number of API keys provided in the `GEMINI_API_KEYS` environment variable, running one job per key in parallel.

```bash
python3 run_add_metadata.py --gcsFolder=<YOUR_GCS_FOLDER_NAME>
```

The `gcsFolder` argument specifies the directory within the `gmechali_csv_testing` GCS bucket where the output files will be saved.

## Using the Generated Data

The script generates JSONL files (one JSON object per line) containing the StatVar metadata.

### 1. Output Location

The output files are saved to a GCS bucket (when using `--useGCS` or running via Cloud Run). The default bucket is `gmechali_csv_testing`. The files will be named with the prefix `sv_complete_metadata_...`.

### 2. Importing to Vertex AI Search

The generated data must be manually loaded into the Vertex AI Search application to be used by the website.

1.  Navigate to the Google Cloud Console.
2.  Go to the **Vertex AI Search** service.
3.  Select the correct project: `datcom-nl`.
4.  Find the search application with Engine ID: `full-statvar-search-prod_1753469819363`.
5.  Import the generated JSONL files from the GCS bucket into the data store associated with this search application.

## API Endpoint Reference

The data indexed in the Vertex AI Search application is consumed by the `/api/stats/stat-var-search` endpoint. This endpoint is defined in `server/routes/shared_api/stats.py`. When a user searches for a statistical variable on the website, this API endpoint queries the Vertex AI Search application to find the most relevant results.
