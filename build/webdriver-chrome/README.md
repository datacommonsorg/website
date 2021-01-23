# Webdriver-chrome Docker Image

## Description

This is a Docker image based on python:3.7, but comes with some other tools:

- Google Chrome: the browser which is used to run the tests.
- ChromeDriver: used to send commands to Google Chrome.
- Java JDK: used to run the Selenium Server, which comes as a JAR file.
- Selenium Server: used to start multiple ChromeDriver instances and run tests in parallel.

## How to build the Docker image

To generate the Docker image and push it to GCS, run

```bash
gcloud builds submit . --config=cloudbuild.yaml
```

Note: You may need to contact Data Commons team to get permission to push image into `datcom-ci` project.

## How to update the Docker image with a newer ChromeDriver version

Change the `_VERS` argument in `cloudbuild.yaml` file with the update date then run:

```bash
gcloud builds submit . --config=cloudbuild.yaml
```
