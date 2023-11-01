# Custom Data Commons

A custom Data Commons can hold new data and include UI modifications that are
custom to a third party's need.

This document illustrates development and deployment details for a custom Data
Commons instance.

## Prerequisites

- Install [docker](https://www.docker.com/products/docker-desktop/)
- [Optional] Install [gcloud](https://cloud.google.com/sdk/docs/install-sdk)
  command line tool.
- [Optional] Have a Google Cloud Project that can be used to deploy the custom
  instance.

## API Key

- A custom Data Commons needs to connect with main Data Commons. Get API key for
  Data Commons by sending an email to `support@datacommons.org`.

- [Optional] Provision a Google Maps API key from your GCP project. This is
  optional and used for place search in visualization tools. Refer to [Maps API
  Key](TODO) section for detailed instructions.

## Local Development

Custom Data Commons instance can be developed and tested locally by following
the instructions below:

### Build docker image locally

```bash
docker build --tag datacommons-website-compose:latest \
-f build/web_compose/Dockerfile \
-t website-compose .
```

### Test custom Data Commons locally with SQLITE database

[Note]: Refer to [Environment Variables](#environment-variables) for setting
environment variables.

In the root of this repository, run:

```bash
docker run -it \
--env-file $PWD/custom_dc/sqlite_env.list \
-p 8080:8080 \
-e DEBUG=true \
-v $PWD/custom_dc/sample:/sqlite \
-v $PWD/server:/workspace/server \
datacommons-website-compose:latest
```

This brings up a local instance with sample data that are stored under
`custom_dc/sample` folder.

Now you can open `localhost:8080/tools/timeline` to browse these sample data.
Also note the base Data Commons data are also avaiable in this instance.

To use your own data, refer to [Import Custom Data](#import-custom-data).

## Cloud Development and Deployment

Custom Data Commons can run on the cloud as a production service. The SQLite
approach can still be used. Note you need to copy the data folders (e.g.,
custom_dc/sample) into the cloud disk (for example, [persistent volume in
GKE](https://cloud.google.com/kubernetes-engine/docs/concepts/persistent-volumes#persistentvolumeclaims))and
mount it to the docker container then specify the enviornment variables based on
the requirements of the cloud providers.

We have also provided a specific deployment setup on Google Cloud Run that is
based on Cloud SQL.

### Setup Google Cloud SQL

Create a Google Cloud SQL instance from the [Cloud
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

[Note]: Refer to [Import Custom Data](#import-custom-data) for preparing the
data files.

Upload the data CSV files into GCS and record the folder path as
`gs://<bucket-name>/.../`. You can start wit the sample data provided under
`custom_dc/sample` and update to your own data later.

### Testing Locally with CloudSQL Database

[Note]: Refer to [Environment Variables](#environment-variables) for setting
environment variables.

Authenticate Google Cloud:

```bash
gcloud auth application-default login
```

This should generate a credential json file in
`$HOME/.config/gcloud/application_default_credentials.json`. This is used in the
command below for authentication in the docker container.

In the root of this repository, run:

```bash
docker run -it \
--env-file $PWD/custom_dc/cloudsql_env.list \
-p 8080:8080 \
-e DEBUG=true \
-e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
-v $HOME/.config/gcloud/application_default_credentials.json:/gcp/creds.json:ro \
-v $PWD/server/templates/custom_dc:/workspace/server/templates/custom_dc \
datacommons-website-compose:latest
```

[Note] you can change the docker image to use your custom built docker image.

### Deploy to Cloud Run

Specify the GCP project and custom instance docker image tag.

```bash
export PROJECT_ID=<YOUR_PROJECT_ID>
export CUSTOM_DC_TAG=<YOUR_TAG>
```

Authenticate for docker image push.

```bash
gcloud auth login
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Create a Container Registry repository if not done yet, this is a one time

```bash
gcloud artifacts repositories create datacommons \
  --project=$PROJECT_ID \
  --repository-format=docker \
  --location=us-central1 \
  --immutable-tags \
  --async
```

Build docker image and push it to Google Artifact Registry

```bash
docker tag datacommons-website-compose:latest \
  us-central1-docker.pkg.dev/$PROJECT_ID/datacommons/website-compose:$CUSTOM_DC_TAG

docker push us-central1-docker.pkg.dev/$PROJECT_ID/datacommons/website-compose:$CUSTOM_DC_TAG
```

In GCP [IAM](https://console.cloud.google.com/iam-admin/iam), grant the default
service account "Cloud SQL Editor" permission. Then run:

```bash
# Then env file is "custom_dc/cloudsql_env.list"
env_vars=$(awk -F '=' 'NF==2 {print $1"="$2}' custom_dc/cloudsql_env.list | tr '\n' ',' | sed 's/,$//')

gcloud run deploy datacommons \
  --allow-unauthenticated \
  --memory 4G \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/datacommons/website-compose:$CUSTOM_DC_TAG \
  --add-cloudsql-instances=<project>:<region>:dc-graph \
  --set-env-vars="$env_vars" \
  --port 8080
```

## Admin Page

There is an admin page under /admin when custom Data Commons is running. It
provides a few operational functions that are protected by secret. To set the
secret, add the secret string in "env.list" file for `ADMIN_SECRET` variable and
restart the server.

For operations that require a secret, enter the secret token in the text input
before the operation.

## Import Custom Data

### Prepare Custom Data

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

Refer to [sample folder](./sample) for supported example data files.

Put all the input files under a local folder or Google Cloud Storage folder, and
use the folder path for environment variable `SQL_DATA_PATH` as described in the
Environment Variables section below.

### Data Config

A config file `config.json` is required and should be put under `SQL_DATA_PATH`.
The detailed spec can be found in this
[doc](https://github.com/datacommonsorg/import/blob/master/simple/stats/config.md).

### Load Data

Custom Data Commons instance supports data refreshing on the fly. You can update
the raw data in the storage (locally or in the Cloud Storage), then in "Admin
page", enter the admin secret and click on "load data". Upon operation
completion, you can see all the processing logs in the page.

You can also load the data by running:

```bash
curl -X POST localhost:8080/admin/load-data -d \
   -H "Content-Type: application/x-www-form-urlencoded" \
   -d "secret=<YOUR_ADMIN_SECRET>"
```

## UI Updates

Default custom Data Commons use `custom` FLASK_ENV which uses a pre-defined html
html and css customization. These customization are in the following folders:

- html files: [location](../server/templates/custom_dc/custom/)
- css and image files: [location](../static/custom_dc/custom/)

Update these files for UI customization then run through the local and cloud
development cycles as illustrated above.

## Environment Variables

Custom Data Commons Development and deployment require a set of environment
variables to be set. These variables should be set in a text file. Example file
for SQLite based instance can be found in ["sqlite_env.list"](./sqlite_env.list).
Example file for CloudSQL based intance can be found in
["cloudsql_env.list"](./cloudsql_env.list).

Below is a detailed description of all the variables available.

| Variable             | Description                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FLASK_ENV            | Base folder name for custom html and css files, default to 'custom'                                                                                           |
| DC_API_ROOT          | API endpoints to access base Data Commons data                                                                                                                |
| DC_API_KEY           | API key for accessing base Data Commons API                                                                                                                   |
| SQL_DATA_PATH        | The folder that holds raw custom Data Commons data; This could be local file path or Google Cloud Storage folder path in the form of `gs://<bucket>/<folder>` |
| USE_SQLITE           | When set to `true`, use local SQLITE as database                                                                                                              |
| USE_CLOUDSQL         | When set to `true`, use Google Cloud SQL as database                                                                                                          |
| GOOGLE_CLOUD_PROJECT | [`USE_CLOUDSQL=true`] GCP project of the Cloud SQL when                                                                                                       |
| CLOUDSQL_INSTANCE    | [`USE_CLOUDSQL=true`] In the form of `<project_id>:<region>:<instance_id>`                                                                                    |
| DB_USER              | [`USE_CLOUDSQL=true`]Cloud SQL database user                                                                                                                  |
| DB_PASS              | [`USE_CLOUDSQL=true`]Cloud SQL database password                                                                                                              |
| ADMIN_SECRET         | [Optional] Secret token to perform /admin page operation                                                                                                      |
| MAPS_API_KEY         | [Optional] Used for map visulization place search                                                                                                             |
