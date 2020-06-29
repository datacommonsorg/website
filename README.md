## Development Locally

### Get permission to use API KEY
Contact DataCommons team to get permission for access of secret manager.

### Set Google Application Credential
Contact DataCommons team to get permission for GCP application credential.
Then run the following command once

```bash
gcloud config set project datcom-browser-staging && \
gcloud auth application-default login

```
This will generate a json file in your local machine, record the path and set
the environment variable in your ~/.bash_profile or ~/.bashrc file

```bash
export GOOGLE_APPLICATION_CREDENTIALS=<JSON_CREDENTIAL_PATH>
```

### Run all the tests

```bash
./run_test.sh
```

### Package javascript and static assets

```bash
./run_npm.sh
```

This will watch static files change and re-build on code edit.


### Start the Flask Server

Start the flask webserver locally at localhost:8080

```bash
./run_server.sh
```

### Start the server using Docker

Another way to start the server locally is to use Docker.

Make sure you have installed [Docker Desktop](https://www.docker.com/products/docker-desktop).

Build Docker image
```bash
docker build -t datacommonsorg-website .
```

Run it locally
```bash
docker run \
-p 8080:8080 \
-e GOOGLE_APPLICATION_CREDENTIALS=<JSON_CREDENTIAL_PATH> \
-v $GOOGLE_APPLICATION_CREDENTIALS:<JSON_CREDENTIAL_PATH>:ro \
datacommonsorg-website
```

## Deploy to AppEngine

- Build compiled asset bundle:

  ```bash
  cd static
  npm run-script build
  cd ..
  ```

- Deploy to Staging:

  ```bash
  cd server && \
  gcloud app deploy app_staging.yaml -q --project=datcom-browser-staging
  ```

- Deploy to Prod:

  ```bash
  cd server && \
  gcloud app deploy app_prod.yaml -q --no-promote --project=datcom-browser-prod
  ```


## Update resource files

### placeid2dcid.json
This file is stored in GCS bucket: datcom-browser-prod.appspot.com (for prod) and
datcom-browser-prod.appspot.com (for local and staging). For updating this file,
please contact DataCommons team.
