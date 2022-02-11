# Developer Guide

Website is deployed in Kubernetes cluster. A deployment contains the following
containers:

- website: A Flask app with static files complied by Webpack.
- mixer: The Data Commons API server.
- esp: Google Extensive Service Proxy used for gRPC to Json transcoding.

[Mixer](https://github.com/datacommonsorg/mixer) is a submodule of this Git
repo. The exact commit of the submodule is deployed together with the website so
it may not be the same API version as `api.datacommons.org`. Make sure to update
and track the mixer change for a new deployment:

```bash
git submodule foreach git pull origin master
```

## Prerequisites

### Basic Development

For development that only involves minor bug fixes or feature additions, the
following steps are required:

- Install [`nodejs`](https://nodejs.org/en/download/)

- Install [`protoc`](https://grpc.io/docs/protoc-installation/)

- Initialize the mixer submodule

  ```bash
  git submodule update --init --recursive
  ```

### Place Search

Development that involves place search needs the following additional
requirements:

- Contact Data Commons team to get dev maps api key.

- Install [`gcloud`](https://cloud.google.com/sdk/docs/install)

- Get GCP authentication

  ```bash
  gcloud auth application-default login
  ```

### Develop with Kubernetes

This is only needed for development with a local Kubernetes cluster (e.g. for
changes dependent on mixer changes).

- Install the following tools:

  - [`Docker`](https://www.docker.com/products/docker-desktop)
  - [`Minikube`](https://minikube.sigs.k8s.io/docs/start/)
  - [`Skaffold`](https://skaffold.dev/docs/install/)
  - [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
  - [`kustomize`](https://kustomize.io/)
  - [`yq` 4.x](https://github.com/mikefarah/yq#install)

## Run Tests

### Install web browser and webdriver

:exclamation:**IMPORTANT**: Make sure that your **ChromeDriver version** is compatible with your **local Google Chrome version**.

Before running the tests, install the browser and webdriver. Here we recommend
you use Google Chrome browser and ChromeDriver.

- Chrome browser can be downloaded [here](https://www.google.com/chrome/).

- ChromeDriver can be downloaded
  [here](https://chromedriver.chromium.org/downloads/version-selection), or you
  can download it using package manager directly:

  ```bash
  npm install chromedriver
  ```

You can view the latest ChromeDriver version
[here](https://chromedriver.storage.googleapis.com/LATEST_RELEASE). Also make
sure PATH is updated with ChromeDriver location.

If using Linux system, you can run the following commands to download Chrome
browser and ChromeDriver, this will also include the path setup:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb; sudo apt-get -fy install
CHROMEDRIVERV=$(curl https://chromedriver.storage.googleapis.com/LATEST_RELEASE)
wget https://chromedriver.storage.googleapis.com/${CHROMEDRIVERV}/chromedriver_linux64.zip
unset CHROMEDRIVERV
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/bin/chromedriver
sudo chown root:root /usr/bin/chromedriver
sudo chmod +x /usr/bin/chromedriver
```

### Run all tests

```bash
./run_test.sh -a
```

### Update React test snapshots

```bash
cd static
npm test testfilename -- -u
```

## Develop with Flask (simple/lite)

This way the website talks to the [autopush Mixer](autopush.api.datacommons.org).

Note: the autopushed mixer can deviate from the mixer submodule and may not be
fully compatible with website.

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

If you don't have DataCommons GCP permissions, run

```bash
./run_server.sh -e lite
```

Other options for -e are `private` for private data commons, or `sustainability`
for sustainability data commons.

This will bring up local website without place search functionality.

There are now multiple environments for the server. To start multiple instances,
bind each server instance to a different port. The following example will start
localhost on port 8081. The default is 8080.

```bash
./run_server.sh -p 8081
```

Please note the strict syntax requirements for the script, and leave a space after the flag.
So `./run_server.sh -p 8081` but not `./run_server.sh -p=8081`.

## Develop with local Kubernetes

This is an alternative way to bring up website stack locally and this is close
to how the production server is deployed in GKE.

Local Kubernetes cluster has similar configurations as the production
deployment, for example, it brings up a local mixer instead of talking to the
autopush/staging mixer.

This is useful for local development that involves data version, mixer and
website changes.

### Start website in Minikube

This takes a few minutes to complete, as it involves building several docker
images. If only website code is changed, can use the [alternative approach](<##-Develop-with-Flask-(simple/lite)>).

**NOTE** Make sure the local Docker engine has more than 12G of memory.

```bash
minikube start --memory=11G
minikube addons enable gcp-auth
eval $(minikube docker-env)
kubectl config use-context minikube
skaffold dev --port-forward -n website
```

This exposes the local website at `localhost:8080`.

### Hot reload

All the code change is synced to the containers through "File Sync" of Skaffold.

Run the following command to get the javascript code recompiled when changed:

```bash
./run_npm.sh
```

Python code change will trigger a restart of the Flask server automatically.

### Monitoring the containers

Run `minikube dashboard` in a separate terminal to start the dashboard, which is
useful for monitoring and controlling the containers.

## Deploy local instance to GCP

Commit all changes locally. Then run

```bash
gcloud auth login
gcloud auth configure-docker
./scripts/push_image.sh
./scripts/deploy_gke.sh dev us-central1
```

The script will build docker image locally and tag it with the local git commit
hash at HEAD, then deploy to GKE.

View the deployoment at [link](https://dev.datacommons.org)

## Other Developing Tips

### GKE config

The GKE configuration is stored [here](deploy/gke/prod.yaml).

### Private Instance

Create a pub/sub topic for mixer to listen to data change.

```bash
gsutil notification create -t tmcf-csv-reload -f json gs://<BUCKET_NAME>
```

### Redis memcache

[Redis
memcache](https://pantheon.corp.google.com/memorystore/redis/instances?project=datcom-website-prod)
is used for production deployment. Each cluster has a Redis instance located in
the same region.

### Adding new charts

1. Update [server/config/chart_config/](../server/config/chart_config)`<category>.json` with the new chart.

   ```javascript
      {
        "category": "", // The top level category this chart belongs to. Order of charts in the spec matters.
        "topic": "",  // Strongly encouraged - A page-level grouping for this chart.
        "titleId": "", // Strictly for translation purposes.
        "title": "", // Default (EN) display string
        "description": "", // Strictly for translation purposes.
        "statsVars": [""], // List of stat vars to include in the chart
        "isOverview": true, // Optional - default false. If the chart should be added to the overview page.
        "isChoropleth": true, // Optional - default false. If a map should be used to display the data
        "unit": "",
        "scaling": 100,
        "relatedChart": {  // Defined if there should be comparison charts added
          // All chart fields from above can be specified. If unspecified, it will be inherited.
        }
      }
   ```

1. Update related files.

   - If adding a new category, create a new config file in [server/chart_config](../server/chart_config) and add the new category to:

     - [static/js/shared/util.ts](../static/js/shared/util.ts)
     - [server/\_\_init\_\_.py](../server/__init__.py)

   - If a new stat var is introduced, also update:

     - Labels that appear as chips under comparison charts: [static/js/i18n/strings/en/stats_var_labels.json](../static/js/i18n/strings/en/stats_var_labels.json)
     - Titles on ranking pages: [static/js/i18n/strings/en/stats_var_titles.json](../static/js/i18n/strings/en/stats_var_titles.json)
     - New stat vars which have not been cached: [NEW_STAT_VARS](../server/configmodule.py)

   - If a new unit is required, update:
     - [static/js/i18n/i18n.tsx](../static/js/i18n/i18n.tsx)
     - [static/js/i18n/strings/\*/units.json](static/js/i18n/strings/en/units.json) (with display names and labels for the unit in **ALL** languages)

   Note: Please add very detailed descriptions to guide our translators. See localization.md for more details.

1. Run these commands:

   ```bash
   ./scripts/extract_messages.sh
   ./scripts/compile_messages.sh
   ```

1. **IMPORTANT**: Manually restart the flask or minikube instance to reload the config and translations. Most likely, this means re-running `run_server.py`

1. Test the data on a place page!

### Debugging Webdriver tests

- Disable headless mode in webdriver to follow the test in Chrome. Chrome
  features like the dev inspector are available in this mode which is useful
  combined with `sleep()` to give you time to inspect the page. To enter this
  mode, comment out this line in
  [base_test.py](../server/webdriver_tests/base_test.py):

  ```python
  chrome_options.add_argument('--headless')
  ```

- Another option is to save a screenshot at various points of the test:

  ```python
  self.driver.save_screenshot(filename)
  ```
