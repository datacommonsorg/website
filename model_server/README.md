# Deploy Embedding Model to Vertex AI

## Build Docker Container

Builds a custom Docker container for sentence transformer model. This updates a
container to `us-central1-docker.pkg.dev/datcom-ci/models/dc-sentence-transformer:latest`

```bash
./push_image.sh
```

## Upload Model to Vertex AI

Uploads a sentence transformer model to Vertex AI Model Registry. The
`MODEL_NAME` here should be a full qualified sentence transformer name like
`sentence-transformers/all-MiniLM-L6-v2`.

```bash
./upload.sh <MODEL_NAME>
```

## Deploy Model for Online Prediction

In GCP [Vertex AI
Model Registry](https://pantheon.corp.google.com/vertex-ai/models?mods=-monitoring_api_staging&project=google.com:datcom-store-dev),
click into the uploaded model, choose "DEPLOY & TEST" and deploy the model to an
endpoint with necessary hardware resources.

## Send Prediction

In the model deployment page, click on "SAPMLE REQUEST" to get example request
command like below:

```bash
ENDPOINT_ID="7753749402006585344"
PROJECT_ID="443333369001"
INPUT_DATA_FILE="test_request.json"

curl \
-X POST \
-H "Authorization: Bearer $(gcloud auth print-access-token)" \
-H "Content-Type: application/json" \
https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/endpoints/${ENDPOINT_ID}:predict \
-d "@${INPUT_DATA_FILE}"
```

Run the command and verify the response is correct. It should contain a list of
embedding array.
