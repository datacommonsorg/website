# Deploy Embedding Model to Vertex AI

## One-time Setup

If you plan to build docker image, do these things first:

1. Install Docker

2. Configure Docker auth by running:

   `gcloud auth configure-docker us-central1-docker.pkg.dev`

## Build Docker Container

Build a custom Docker container for deploying embedding models. This updates a
container to
`us-central1-docker.pkg.dev/datcom-ci/models/embedding-model:<TAG>`.
Note the TAG is the current git hash.

```bash
./push_image.sh
```

## Upload Model to Vertex AI

Uploads an embedding model to Vertex AI Model Registry. The supported
`MODEL_NAME` can be found in `model.list`.

```bash
./upload.sh [MODEL_NAME] [PROJECT_ID]
```

## Deploy Model for Online Prediction

In GCP Vertex AI Model Registry, click into the uploaded model, choose "DEPLOY &
TEST" and deploy the model to an endpoint with necessary hardware resources.

## Send Prediction

In the model deployment page, click on "SAPMLE REQUEST" to get example request
command like below:

```bash
ENDPOINT_ID="7753749402006585344"
PROJECT_ID="443333369001"
INPUT_DATA_FILE="example_request.json"

curl \
-X POST \
-H "Authorization: Bearer $(gcloud auth print-access-token)" \
-H "Content-Type: application/json" \
https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/endpoints/${ENDPOINT_ID}:predict \
-d "@${INPUT_DATA_FILE}"
```

Run the command and verify the response is correct. It should contain a list of
embedding array.

## Running locally

To run it locally, invoke the following command from a terminal:

```bash
./run_local.sh <model-name>

./run_local.sh cross-encoder/ms-marco-MiniLM-L-6-v2
```

Then issue POST requests:

```bash
curl \
-X POST \
-H "Content-Type: application/json" \
-d '{"instances": [["poverty", "poor"], ["poverty", "rich"]]}' \
http://localhost:8080/predict
```
