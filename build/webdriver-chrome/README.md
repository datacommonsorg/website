# Webdriver-chrome Docker Image

## Description

This is a Docker image based on python:3.7, but comes with some other tools:

- Google Chrome: the browser which is used to run the tests.
- ChromeDriver: used to send commands to Google Chrome.

## How to update the Docker image

To generate the Docker image and push it to GCS, change the version number
in cloudbuild.yaml, then run:

```bash
gcloud builds submit . --config=cloudbuild.yaml
```

Note: You may need to contact Data Commons team to get permission to push image
into `datcom-ci` project.
