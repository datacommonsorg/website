# Statistical Variable Metadata Generation

This directory contains scripts to augment metadata with alternative sentences for Data Commons Statistical Variables (StatVars). The primary script, `add_metadata.py`, fetches StatVar metadata, optionally uses the Gemini API to generate alternative natural language sentences, and exports the results to JSONL files.

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
2.  Set the correct project. The scripts are configured to use `datcom-nl`.
    ```bash
    gcloud config set project datcom-nl
    ```

## Running the Script

There are two primary ways to run the metadata generation process: locally for small-scale tests or via a Cloud Run job for large-scale production runs.

### Local Execution (for testing)

You can run `add_metadata.py` directly to process a small number of StatVars. This is useful for testing and debugging.

```bash
python add_metadata.py [FLAGS]
```

**Common Flags:**

*   `--generateAltSentences`: (Optional) If present, the script will call the Gemini API to generate alternative sentences.
*   `--useBigQuery`: (Optional) Pull all StatVars from the BigQuery `datcom-store.dc_kg_latest.StatisticalVariable` table. If omitted, it processes a smaller, curated list of StatVars used for NL search. This input can be found in `tools/nl/embeddings/input/base/sheests_svs.csv`.
*   `--maxStatVars=<NUMBER>`: (Optional) Limits the number of StatVars to process. Useful for quick tests.
*   `--useGCS`: (Optional) Saves the output files to/reads input files from the GCS bucket `gs://metadata_for_vertexai_search` instead of the local filesystem.
*   `--failedAttemptsPath=<PATH>`: (Optional) Re-process a file or folder of previously failed metadata generation attempts. See the "Handling Failures" section for more details.

### Cloud Run Execution (for production)

For processing the entire set of StatVars from BigQuery, the recommended approach is to use the `run_add_metadata.py` script. This script triggers a `stat-var-metadata-generator` Cloud Run job in the `us-central1` region, which runs the `add_metadata.py` script in a containerized environment.

The script will automatically partition the workload across the number of API keys provided in the `GEMINI_API_KEYS` environment variable, running one job per key in parallel. For reference, a previous run across all 250k stat vars in base DC's BigQuery table took approximately 1 hour for 12 parallel jobs to complete. 

By default, `run_add_metadata.py` executes the Cloud Run job with the following configuration:
*   Processes the full set of StatVars from BigQuery (`--useBigQuery`).
*   Generates alternative sentences for each StatVar (`--generateAltSentences`).
*   Saves the output to GCS (`--useGCS`).

```bash
# Run with default settings
python run_add_metadata.py
```

You can also specify an optional `--gcsFolder` argument to override the default output directory in GCS.

```bash
# Run with a custom output folder
python run_add_metadata.py --gcsFolder="my_custom_folder"
```

After starting the job, you can monitor its status in the [Cloud Run section of the GCP Console](https://console.cloud.google.com/run) for the `datcom-nl` project.

For reference, the results of previous experimental runs can be found in the `datcom-website-dev` GCP project, under the `gmechali-csv-testing` GCS bucket. Note that these are purely  historical runs for reference-use only; any future runs should be done in `datcom-nl`.

### Handling Failures

If the Gemini API fails to generate sentences for a batch of StatVars after several retries, the script will save the metadata for that failed batch to a separate file. These files are saved in a `failures/` subdirectory within the main output folder.

You can re-run the script on just these failed batches by using the `--failedAttemptsPath` flag and pointing it to the specific file or folder of failed attempts.

## Using the Generated Data

The script generates JSONL files (one JSON object per line) containing the StatVar metadata.

### 1. Output Location

When running via Cloud Run or using the `--useGCS` flag, the output files are saved to the `metadata_for_vertexai_search` GCS bucket in the `datcom-nl` project. The script automatically determines the destination folder based on the run configuration:

*   **From BigQuery (`--useBigQuery`)**: `gs://metadata_for_vertexai_search/full_statvar_metadata_staging/YYYY_MM_DD/`
*   **From Curated List (default)**: `gs://metadata_for_vertexai_search/nl_statvar_metadata_staging/YYYY_MM_DD/`
*   **Re-running a Failed Batch (`--failedAttemptsPath`)**: `gs://metadata_for_vertexai_search/statvar_metadata_retries/YYYY_MM_DD/`

The `YYYY_MM_DD` folder is named based on the date the script was run.

### 2. Importing to Vertex AI Search

The generated data must be manually loaded into the Vertex AI Search application to be used by the website.

1.  Navigate to the Google Cloud Console.
2.  Go to the **AI Applications** service.
3.  Select the correct project: `datcom-nl`.
4.  Select the correct app: `full_statvar_search_staging`.
5.  Import the generated JSONL files from the GCS bucket into the data store associated with this search application.

When promoting from staging to prod, the app to be used is `full_statvar_search_prod`. Promotion can be done by simply switching the application's data store over to the staging datastore. See internal documentation for more details.

## Updating the Cloud Run Job

The Cloud Run job runs from a Docker image. If you make any changes to the scripts in this directory (`add_metadata.py`, `gemini_prompt.py`, etc.), you must build and deploy a new Docker image for the changes to take effect in the Cloud Run environment.

1.  **Authenticate to the `datcom-ci` project:**
    ```bash
    gcloud config set project datcom-ci
    ```
2.  **Navigate to this directory:**
    ```bash
    cd tools/nl/nl_metadata
    ```
3.  **Submit the build:**
    ```bash
    gcloud builds submit --region=us-west1 --tag us-west1-docker.pkg.dev/datcom-ci/cloud-run-source-deploy/nl-metadata-image:latest
    ```
4.  **Verify the deployment:**
    You can verify that the new image was built and pushed successfully by checking the [Artifact Registry in the `datcom-ci` project](https://console.cloud.google.com/artifacts/docker/datcom-ci/us-west1/cloud-run-source-deploy).

5.  **Switch back to the `datcom-nl` project** to run the job:
    ```bash
    gcloud config set project datcom-nl
    ```

## API Endpoint Reference

The data indexed in the Vertex AI Search application is consumed by the `/api/stats/stat-var-search` endpoint. This endpoint is defined in `server/routes/shared_api/stats.py`. When a user searches for a statistical variable on the website, this API endpoint queries the Vertex AI Search application to find the most relevant results.