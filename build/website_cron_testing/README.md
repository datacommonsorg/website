# Website Cron Testing Docker Image

## Description

This is a Docker image based on gcr.io/datcom-ci/webdriver-chrome:2023-06-17, but comes with:

- Script (and files required by the script) to run the website cron tests

## How to update the Docker image

To generate the Docker image and push it to GCS:

```bash
./push_image.sh
```
