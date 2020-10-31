# Webdriver-chrome Docker Image

## Description

This is a Docker image based on python:3.7-slim, but with chrome and chromedriver preinstalled which can help using Selenium to do automation tests.

## How to build the Docker image

To generate the Docker image and push it to GCS, run

```bash
gcloud builds submit . --config=cloudbuild.yaml
```

Note: You may need to contact Data Commons team to get permission to push image into `datcom-ci` project.

## How to update the Docker image with newer chromedriver version

You can change the `VERS` argument in `Dockerfile` and `_VERS` argument in `cloudbuild.yaml` file with the chromedriver version you want, then run the above command.
