# Statistical Variable Metadata Generation

This directory contains scripts to augment metadata with alternative sentences for Data Commons Statistical Variables (StatVars). The primary script, `generate_nl_metadata.py`, fetches StatVar metadata, optionally uses the Gemini API to generate alternative natural language sentences, and exports the results to JSONL files.

These generated files are intended to be used as a data source for a Vertex AI Search application to power natural language search over statistical variables. For an example Vertex AI Search application, see go/sv-search-preview. 

## Setup

### 0. Developer Environment

Be sure to follow the steps in the [developer guide](https://github.com/datacommonsorg/website/blob/master/docs/developer_guide.md) prior to running this script to ensure that you have the proper versions and setup of python, gcloud, etc.. 

### 1. Environment Variables

Before running the scripts, you need to set up your API keys.

1.  Copy the sample environment file:
    ```bash
    cp .env.sample .env
    ```
2.  Edit the newly created `.env` file and add your API keys:
    *   `DC_API_KEY`: Your Data Commons API key.
    *   `GEMINI_API_KEY`: A single Gemini API key, used for local runs.
    *   `GEMINI_API_KEYS`: A comma-separated list of Gemini API keys, used for parallelized Cloud Run jobs (`trigger_nl_metadata_job.py`). Separate API keys are used per Cloud Run job to prevent 429 (resource exhaustion) errors from Gemini. 

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

The script operates in several modes, controlled by the `--runMode` flag.

#### Main Run Modes

*   `--runMode bigquery`
    *   **Purpose:** To perform a full, clean generation of metadata for all StatVars in the production BigQuery table.
    *   **Output:** Writes to a new, timestamped folder in GCS (e.g., `gs://metadata_for_vertexai_search/full_statvar_metadata_staging/YYYY_MM_DD/`).
    *   **Use Case:** Use this when you need to build the entire dataset from scratch.

*   `--runMode bigquery_diffs`
    *   **Purpose:** For periodic (e.g., weekly) updates. It compares an existing GCS folder of metadata against BigQuery, finds the new StatVars, and processes only them.
    *   **Output:** Writes new `diff_[timestamp]_[partition].jsonl` files into the *same* GCS folder provided via the `--gcsFolder` argument.
    *   **Use Case:** This is the standard mode for keeping your Vertex AI datastore up-to-date without reprocessing the entire dataset.

*   `--runMode retry_failures`
    *   **Purpose:** To reprocess batches that failed in a previous `bigquery` or `bigquery_diffs` run.
    *   **Output:** Writes successfully retried batches as new `diff_retry_[timestamp]_[partition].jsonl` files into the folder specified by `--gcsFolder`.
    *   **Use Case:** Run this after a `bigquery_diffs` job if any failure files were generated.

*   `--runMode compact`
    *   **Purpose:** A utility to merge the many small `diff` and `retry` files into a single, clean master file.
    *   **Output:** Creates a new `compacted_[timestamp].jsonl` file in the specified `--gcsFolder`. Can optionally delete the original files it merged.
    *   **Use Case:** Run this periodically (e.g., monthly) to keep your GCS directory tidy.

### Example Periodic Update Workflow

This workflow is designed to keep a Vertex AI datastore that reads from a GCS folder (e.g., `my-periodic-folder`) up-to-date.

**1. Weekly: Run the Diffs Job**

Run the script in `bigquery_diffs` mode to find and process any new StatVars that have been added to Data Commons in the last week. For production runs, you should run multiple jobs in parallel across partitions.

*Command (example for one partition):*
```bash
python3 tools/nl/nl_metadata/generate_nl_metadata.py \
    --runMode bigquery_diffs \
    --useGCS \
    --gcsFolder=my-periodic-folder \
    --totalPartitions=10 \
    --currPartition=0
```

**2. After Diffs Job: Handle Failures (if any)**

If the previous job produced files in `my-periodic-folder/failures/`, run the script in `retry_failures` mode to re-process them.

*Command:*
```bash
python3 tools/nl/nl_metadata/generate_nl_metadata.py \
    --runMode retry_failures \
    --useGCS \
    --failedAttemptsPath=my-periodic-folder/failures/ \
    --gcsFolder=my-periodic-folder
```

**3. Monthly: Run the Compaction Job**

To prevent the buildup of hundreds of small `diff_...` files, run the `compact` job periodically to merge them all into a single file.

*Command (with cleanup):*
```bash
python3 tools/nl/nl_metadata/generate_nl_metadata.py \
    --runMode compact \
    --gcsFolder=my-periodic-folder \
    --delete_originals
```

## Using the Generated Data

The generated data must be manually loaded into the Vertex AI Search application to be used by the website.

1.  Navigate to the Google Cloud Console.
2.  Go to the **AI Applications** service.
3.  Select the correct project: `datcom-nl`.
4.  Select the correct app: `full_statvar_search_staging`.
5.  Import the generated JSONL files from the GCS bucket into the data store associated with this search application.

When promoting from staging to prod, the app to be used is `full_statvar_search_prod`. Promotion can be done by simply switching the application's data store over to the staging datastore. See internal documentation for more details.


## Updating the Cloud Run Job

The Cloud Run job runs from a Docker image. If you make any changes to the scripts in this directory (`generate_nl_metadata.py`, `gemini_prompt.py`, etc.), you must build and deploy a new Docker image for the changes to take effect in the Cloud Run environment.

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

## Running unit tests

A few end-to-end unit tests are defined for the `generate_nl_metadata.py` script under `./tests/test_generate_nl_metadata.py`. To run this test, run the script `./run_tests.sh` from this directory. Note that these tests are not currently run as part of the script `website/run_test.sh`.

## API Endpoint Reference

The data indexed in the Vertex AI Search application is consumed by the `/api/stats/stat-var-search` endpoint. This endpoint is defined in `server/routes/shared_api/stats.py`. When a user searches for a statistical variable on the website, this API endpoint queries the Vertex AI Search application to find the most relevant results.