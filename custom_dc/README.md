# Custom Data Commons

A custom Data Commons (DC) can hold new data and include UI modifications that are
custom to a third party's need.

This document illustrates development and deployment details for a custom Data
Commons instance.

## Custom and Base DCs

![Custom Data Commons](./system_diagram.jpg)

The diagram above is a high-level view of the relationship between custom and base DC instances.
As indicated, custom and base DCs largely share the same software stack.
Additionally, a custom DC combines its own local datasets with base DC datasets to provide a unified view.

## Prerequisites

- Install [docker](https://www.docker.com/products/docker-desktop/)
- [Optional] Install [gcloud](https://cloud.google.com/sdk/docs/install-sdk)
  command line tool.
- [Optional] Have a Google Cloud Project that can be used to deploy the custom
  instance.

## API Key

- A custom Data Commons needs to connect with main Data Commons. Get API key for
  Data Commons by sending an email to `support@datacommons.org`.

- Obtain a Google Maps API key following [this
  guide](https://developers.google.com/maps/documentation/javascript/get-api-key).
  You can use a sample key `AIzaSyA9RsPS8tBCKwrET3qqAzydhOMWP0Ee8Y8` for local
  development as discussed below.

## Quick Start

Once the prerequisites and api keys from above are in place, 
here's how you can start a local custom DC instance quickly.

> Note that this is only a quick start section. See the rest of the sections for more details.

### Clone this repository

If you haven't already, clone this repository and `cd` into the root of the repo folder (`website`).
References to various files and commands in this section will be relative to this root.

```bash
git clone https://github.com/datacommonsorg/website.git
cd website
```

### Env variables

Open [sqlite_env.list](sqlite_env.list) and specify values for `DC_API_KEY` and `MAPS_API_KEY`. Leave `ADMIN_SECRET` blank for now.

> IMPORTANT: Do not use double-quotes or spaces when specifying the values.

### Start services

To start the custom DC services, in the root of this repository, run Docker as follows:

```bash
docker run -it \
-p 8080:8080 \
-e DEBUG=true \
--env-file $PWD/custom_dc/sqlite_env.list \
-v $PWD/custom_dc/sample:/userdata \
-v $PWD/server/templates/custom_dc/custom:/workspace/server/templates/custom_dc/custom \
gcr.io/datcom-ci/datacommons-website-compose:stable
```

The first time this is run, it will download the latest stable docker image (`gcr.io/datcom-ci/datacommons-website-compose:stable`) from the cloud 
which could take a few minutes. Subsequent runs will use the previously downloaded image on your machine.

### Local website

Once Docker is up and running, you can visit your local custom DC instance in your browser: (http://localhost:8080).
You can browse the various tools (Variables, Map, Timeline, etc.) and work with the entire base DC dataset in your custom instance.

### Load custom data

To load custom data, point your browser to the admin page at (http://localhost:8080/admin).

Since we've not specified an `ADMIN_SECRET` yet, leave it blank. Click on "Load Data".

Clicking the "Load Data" button will load the sample data provided for you in `custom_dc/sample`. The custom data that was used here was specified in the `docker run` command (`-v $PWD/custom_dc/sample:/userdata`).

Loading the data may take a few seconds. Once it is successful, you can visit the timeline explorer (http://localhost:8080/tools/timeline) 
and other tools again to explore the custom data that you just loaded.

### Next steps

As next steps, you can load your actual data and / or customize the look and feel of your custom DC pages.

You can load your actual data either by copying it to the `custom_dc/sample` folder
or by updating the `-v` mapping when running Docker to point to a different data folder (i.e. `-v /path/to/your/data/folder:/userdata`)

You can customize the look and feel by updating the html files under 
`server/templates/custom_dc/custom`.

Congratulations on bringing up your own Custom DC instance!

Now that you have your instance running, consider going through the rest of the sections 
for more details on Custom DC development.

## Local Development

Custom Data Commons instance can be developed and tested locally by following
the instructions below:

### Build docker image locally

```bash
docker build --tag datacommons-website-compose:latest \
-f build/web_compose/Dockerfile \
-t website-compose .
```

### Test custom Data Commons locally with SQLite database

[Note]: Refer to [Environment Variables](#environment-variables) for setting
environment variables.

In the root of this repository, run:

```bash
docker run -it \
--env-file $PWD/custom_dc/sqlite_env.list \
-p 8080:8080 \
-e DEBUG=true \
-v $PWD/custom_dc/sample:/userdata \
-v $PWD/server:/workspace/server \
datacommons-website-compose:latest
```

This brings up a local instance with sample data that are stored under
`custom_dc/sample` folder.

Now you can open `localhost:8080/tools/timeline` to browse these sample data.
Also note the base Data Commons data are also avaiable in this instance.

[Note]: The local sample data path should always bind to `/userdata`.

[Note]: The SQLite database is in the Docker runtime and does not persist. To
persist the SQLite database, can bind it to a local directory by adding `-v
<local_path>:/sqlite/` in the `docker run` command. By doing this, when you run
the command and starting the servers, it can use the existing database.

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

The examples below show how you can prepare your data to be imported into a
custom DC instance.

The first column header is a property that identifies the observed entity.
Supported properties in the examples below are `dcid`, `name`, `geoId`.
When `dcid` is used, the entity should have been resolved (i.e. mapped to a DC
identifier from a previous step).

The second column is a property that identifies the date.

The last two columns identify IDs of metrics or statistical variables, with the
column containing the corresponding numeric values.

> Note that the treatment of variables in this section is much simplified for
> the purposes of this discussion.
> For a more detailed discussion on the DC data model, please refer to the
> document on [Representing statistics in Data
> Commons](https://github.com/datacommonsorg/data/blob/master/docs/representing_statistics.md).

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

Refer to [sample folder](./sample) for supported example data files.

Put all the input files under a local folder or Google Cloud Storage (GCS)
folder.

When using local folder, should bind it to `/userdata/` folder in `docker run`:

```bash
docker run -it \
... \
-v <LOCAL_PATH>:/userdata
```

When using GCS, should specify environment variable `GCS_DATA_PATH` as described
in the Environment Variables section below.

### Data Config

A config file `config.json` is required and should be put under the same folder
as the CSV files.

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

### Update Header, Footer and Page Content

Page header and footer can be customized in
[base.html](../server/templates/custom_dc/custom/base.html)
by updating the html element within `<header></header>` and `<footer></footer>`.

Homepage can be customized in
[homepage.html](../server/templates/custom_dc/custom/homepage.html).

### Update CSS and Javascript

The custom Data Commons provides an
[overrides.css](../static/custom_dc/custom/overrides.css)
to override CSS styles. It has a default color override. More style changes can
be added in that file.

If there are already existing CSS and Javascript files, put them under the
[/static/custom_dc/custom](../static/custom_dc/custom)
folder. Then include these files in the `<head>` section of the corresponding
html files as

```html
<link href="/custom_dc/custom/<additional>.css" rel="stylesheet" />
```

or

```html
<script src="/custom_dc/custom/<additional>.js"></script>
```

## Environment Variables

Custom Data Commons Development and deployment require a set of environment
variables to be set. These variables should be set in a text file. Example file
for SQLite based instance can be found in ["sqlite_env.list"](./sqlite_env.list).
Example file for CloudSQL based intance can be found in
["cloudsql_env.list"](./cloudsql_env.list).

Below is a detailed description of all the variables available.

| Variable             | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| FLASK_ENV            | Base folder name for custom html and css files, default to 'custom'                              |
| DC_API_ROOT          | API endpoints to access base Data Commons data                                                   |
| DC_API_KEY           | API key for accessing base Data Commons API                                                      |
| GCS_DATA_PATH        | When storing data in Google Cloud Storage, the data path in the form of `gs://<bucket>/<folder>` |
| USE_SQLITE           | When set to `true`, use local SQLITE as database                                                 |
| USE_CLOUDSQL         | When set to `true`, use Google Cloud SQL as database                                             |
| GOOGLE_CLOUD_PROJECT | [`USE_CLOUDSQL=true`] GCP project of the Cloud SQL when                                          |
| CLOUDSQL_INSTANCE    | [`USE_CLOUDSQL=true`] In the form of `<project_id>:<region>:<instance_id>`                       |
| DB_USER              | [`USE_CLOUDSQL=true`]Cloud SQL database user                                                     |
| DB_PASS              | [`USE_CLOUDSQL=true`]Cloud SQL database password                                                 |
| ADMIN_SECRET         | [Optional] Secret token to perform /admin page operation                                         |
| MAPS_API_KEY         | [Optional] Used for map visulization place search                                                |
