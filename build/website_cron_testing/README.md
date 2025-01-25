# Website Cron Testing Docker Image

## Description

This is a Docker image based on gcr.io/datcom-ci/webdriver-chrome, but comes with:

- Script (and files required by the script) to run the website cron tests

## How to update the Docker image

Generally you shouldn't have to do this manually since it happens as part of the website autopush pipeline (see build/ci/cloudbuild.push.yaml).

If you can't wait for the next autopush build, you can run a script to generate this image as well as some others that are usually autopushed and push them all to GCS as latest:

```bash
.scripts/push_image.sh
```
