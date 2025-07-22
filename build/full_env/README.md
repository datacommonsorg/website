# Docker Image with all deps for website, NL, and mixer servers plus
# webdriver tests

## Description

This container includes:
- Python 3.11.4
- Node 18.4.0
- Golang 1.20.7
- Go plugins:
  - protoc-gen-go 1.30.0
  - protoc-gen-go-grpc 1.3.0
- Protoc 3.21.12
- Envoy 1.31.0
- GCloud SDK 469.0.0
- Chrome stable + compatible ChromeDriver

## How to update the Docker image

To generate the Docker image and push it to GCS:

1. Change the version date in cloudbuild.yaml
2. Run (from this directory):

```bash
gcloud config set project datcom-ci
gcloud builds submit . --config=cloudbuild.yaml
```
