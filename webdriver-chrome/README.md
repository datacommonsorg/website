# Webdriver-chrome Docker Image

## Description

This is a Docker image based on python:3.7-slim, but comes with some other tools:
    1. Google Chrome: the browser which is used to run the tests.
    2. ChromeDriver: used to send commands to Google Chrome.
    3. Java JDK: used to run the Selenium Server, which comes as a JAR file.
    4. Selenium Server: used to start multiple ChromeDriver instances and run tests in parallel.

## How to build the Docker image

To generate the Docker image and push it to GCS, run

```bash
gcloud builds submit . --config=cloudbuild.yaml
```

Note: You may need to contact Data Commons team to get permission to push image into `datcom-ci` project.

## How to update the Docker image with a newer ChromeDriver version

You can change the `VERS` argument in `Dockerfile` and `_VERS` argument in `cloudbuild.yaml` file with the ChromeDriver version you want, then run the above command.
