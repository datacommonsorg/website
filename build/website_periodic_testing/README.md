# Website Periodic Testing Docker Image

## Description

This is a Docker image based on python:3.11, but comes with:

- Google Chrome: the browser which is used to run the tests.
- ChromeDriver: used to send commands to Google Chrome.
- Script (and files required by the script) to run the website periodic tests

## How to update the Docker image

To generate the Docker image and push it to GCS:

```bash
./push_image.sh
```
