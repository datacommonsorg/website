# Docker Image with all deps for website, NL, and mixer servers plus
# webdriver tests

## Description

This container includes:
- Python 3.11.4
- Golang 1.23.11
- Go plugins:
  - protoc-gen-go 1.30.0
  - protoc-gen-go-grpc 1.3.0
  - golangci-lint 2.3.0
- Protoc 3.21.12
- Envoy 1.31.0
- GCloud SDK 469.0.0
- Command line tools:
  - git
  - curl
  - yq
  - kubectl
- *Node 18.4.0
- *Chrome stable + compatible ChromeDriver

The `mixer-only` versions of the image exclude the starred, website-only deps.

The image is optimized for versatility, not size. It should be used for running
Cloud Build steps but not as the base for any released images.

## How to update the Docker image

To generate the Docker image and push it to GCS:

1. Change the version date in cloudbuild.yaml
2. Run (from this directory):

```bash
gcloud config set project datcom-ci
gcloud builds submit . --config=cloudbuild.yaml
```
