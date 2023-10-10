# Custom Data Commons

A custom Data Commons can hold new data and include UI modifications that are
sutiable to a third party's need.

This document illustrates development and deployment details for a custom Data
Commons instance.

## Prerequisit

- Install [docker](https://www.docker.com/products/docker-desktop/)
- [Optional] Install [gcloud](https://cloud.google.com/sdk/docs/install-sdk)
  command line tool.

## API Key

- A custom Data Commons needs to connect with main Data Commons. Get API key for
  Data Commons by sending an email to `support@datacommons.org`.

- [Optional] Provision a Google Maps API key from your GCP project. This is
  optional and used for place search in visualization tools. Refer to [Maps API
  Key](TODO) section for detailed instructions.

## Prepare Custom Data

Note: Skip this section if you don't have custom Data.

Prepare CSV files with statistical data in the following formats:

```csv
geoId,observationDate,stat_var_1,var_2
06,2021,555,666
08,2021,10,10
```

```csv
name,observationDate,stat_var_1,stat_var_2
California,2021,555,666
Colorado State,2021,10,10
```

```csv
dcid,observationDate,stat_var_1,stat_var_2
geoId/06,2021,555,666
geoId/08,2021,10,10
```

The first column header is a property that identifies the observed entity,
supported properties are `dcid`, `name`, `geoId`. When `dcid` is used, the
entity should have been resolved (from a previous step).

## UI Updates

Make changes in this repo, commit the change via `git commit` command and then
build a new docker image:

```bash
WEBSITE_HASH=$(git rev-parse --short=7 HEAD)
docker build \
  --tag datacommons-website/compose:$WEBSITE_HASH \
  -f build/web_compose/Dockerfile \
  -t website-compose .
```

## Run Locally

A custom Data Commons can store data in a SQLite backed local database. This
allows fast development cycle in a local machine and cloud deployment when the
data size is small.

Make a folder `mkdir $HOME/dc-data` and move the data CSV files into it.

Start custom Data Commons instance by running:

```bash
docker run -it --pull=always \
-e DC_API_KEY=<YOUR_DC_API_KEY> \
-e MAPS_API_KEY=<YOUR_MAPS_API_KEY> \
-e FLASK_ENV=custom \
-e ENV_PREFIX=Compose \
-e USE_LOCAL_MIXER=true \
-e USE_SQLITE=true \
-e SQL_DATA_PATH=/sqlite \
-p 8080:8080 \
-v $HOME/dc-data:/sqlite \
gcr.io/datcom-ci/datacommons-website-compose:latest
```

Run `curl -X POST localhost:8080/import/simple/load` to load the data into
database. Whenever there is update on the data, re-run this commands (no need to
restart the container).

If you have your own UI updates and build the docker image locally, replace the
docker image with your locally one in the command.

Now you can access a custom Data Commons site via
[localhost](http://localhost:8080). For example, the data from the sample data
can be viewed in [Timeline Chart](http://localhost:8080/tools/timeline#place=geoId%2F06&statsVar=stat_var_1).

## Run in Cloud

Custom Data Commons can be ran on the cloud as a production service. The SQLite
approach can still be used. Note you need to copy the data folders into the
cloud disk and mount it to the docker container then specify the enviornment
variables based on the requirements of the cloud providers.

We have also provided a specific deployment setup on GCP that is based on Cloud
SQL.

### Setup Cloud SQL

Create a Cloud SQL instance from the [Cloud
Console](https://console.cloud.google.com/sql/instances). Set instance ID as
`dc-graph`, choose the type as "MySQL" and create a database `datacommons`. You
will need to set a user and password. Record the instance connection name in the
form of "<project>:<region>:dc-graph"

### Setup Google Cloud Storage

Google Cloud Storage is used to hold the data CSV files. From the [Cloud
Console](https://console.cloud.google.com/storage/browser), create a new bucket
or pick an existing bucket and upload the data CSV files there. It's recommended
to create intermediate folders for the files for easier management.

### Upload Data Files

Upload the data CSV files into GCS and record the folder path as
`gs://<bucket-name>/.../`.

### Test Locally

The CloudSQL backed custom DC can run locally. Need to run `gcloud auth
application-default login` to get a credential json file locally. Then run:

```bash
docker run -it \
-e DC_API_KEY=<YOUR_DC_API_KEY> \
-e MAPS_API_KEY=<YOUR_MAPS_API_KEY> \
-e FLASK_ENV=custom \
-e ENV_PREFIX=Compose \
-e USE_LOCAL_MIXER=true \
-e USE_CLOUDSQL=true \
-e SQL_DATA_PATH=<gs://bucket-name/.../> \
-e CLOUDSQL_INSTANCE=<project>:<region>:dc-graph \
-e DB_USER=<DB_USER> \
-e DB_PASS=<DB_PASS> \
-e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
-v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
-p 8080:8080 \
gcr.io/datcom-ci/datacommons-website-compose:latest
```

Note: you can change the docker image to use your custom built docker image.

### Deploy to Cloud Run

In GCP [IAM](https://console.cloud.google.com/iam-admin/iam), grant the default
service account "Cloud SQL Editor" permission. Then run:

```bash
gcloud run deploy datacommons \
  --allow-unauthenticated \
  --memory 4G \
  --image gcr.io/datcom-ci/datacommons-website-compose:latest \
  --add-cloudsql-instances=<project>:<region>:dc-graph \
  --set-env-vars SQL_DATA_PATH=<gs://bucket-name/.../> \
  --set-env-vars USE_CLOUDSQL=true \
  --set-env-vars CLOUDSQL_INSTANCE=<project>:<region>:dc-graph \
  --set-env-vars DC_API_KEY=<YOUR_DC_API_KEY> \
  --set-env-vars MAPS_API_KEY=<YOUR_MAPS_API_KEY> \
  --set-env-vars FLASK_ENV=custom \
  --set-env-vars ENV_PREFIX=Compose \
  --set-env-vars USE_LOCAL_MIXER=true \
  --set-env-vars DB_USER=<DB_USER> \
  --set-env-vars DB_PASS=<DB_PASS> \
  --port 8080
```
