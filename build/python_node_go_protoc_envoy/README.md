# Website Compose Docker Image

## Description

This is a Docker image that has Python, Node, Go and Protoc. It can be used
as the base image for the website compose container.

## How to update the Docker image

To generate the Docker image and push it to container registry, change the
version number in `cloudbuild.yaml`, then run:

```bash
gcloud config set project datcom-ci
gcloud builds submit . --config=cloudbuild.yaml
```
