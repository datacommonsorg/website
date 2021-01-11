# Developer Guide

Website is deployed in Kubernetes cluster. A deployment contains the following
containers:

- Website: A Flask app with static files complied with Webpack.
- Mixer: The Data Commons API server.
- ESP: Google Extensive Service Proxy used for gRPC to Json transcoding.

[Mixer](https://github.com/datacommonsorg/mixer) is a submodule of this Git repo.

The exact commit of the sub-module is deployed together with the website so it may
not be the same API version as `api.datacommons.org`.

Make sure to update track the mixer change for a new deployment:

```bash
git submodule foreach git pull origin master
```

## Prerequisit

- Contact Data Commons team to get dev maps api key.

- Contact Data Commons team to get permission for BigTable and BigQuery permission.

- Get GCP authentication

  ```bash
  gcloud auth application-default login
  ```

- Install the following tools:

  - [`Docker`](https://www.docker.com/products/docker-desktop)
  - [`Minikube`](https://minikube.sigs.k8s.io/docs/start/)
  - [`Skaffold`](https://skaffold.dev/docs/install/)
  - [`gcloud`](https://cloud.google.com/sdk/docs/install)
  - [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
  - [nodejs](https://nodejs.org/en/download/)

## Run Tests

### Install web browser and webdriver

Before running the tests, install the browser and webdriver. Here we recommend you use Google Chrome browser and ChromeDriver.

- Chrome browser can be downloaded [here](https://www.google.com/chrome/).

- ChromeDriver can be downloaded [here](https://chromedriver.chromium.org/downloads/version-selection), or you can download it using package manager directly:

  ```bash
  npm install chromedriver
  ```

If using Linux system, you can run the following commands to download Chrome browser and ChromeDriver, this will also include the path setup:

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

Note: Make sure that your ChromeDriver version is compatible with your local Google Chrome version.
You can change view the lastet ChromeDriver version [here](https://chromedriver.storage.googleapis.com/LATEST_RELEASE).
Also make sure PATH is updated with ChromeDriver location.

### Run all tests

```bash
./run_test.sh -a
```

### Update React test snapshots

```bash
cd static
npm test testfilename -- -u
```

## Develop with local Kubernets (Recommended)

Developing the website with local Kubernetes cluster makes the local app close to
production deployment.

### Start mixer in Minikube

```bash
minikube start --memory=6G
minikube addons enable gcp-auth
eval $(minikube docker-env)
skaffold dev --port-forward -n website
```

This exposes the local website at `localhost:8080`.

### Hot reload

Run the following command to get the javascript code recompiled when changed

```bash
./run_npm.sh
```

Python code change will trigger a restart of the Flask server automatically.

All the code change is synced to the container files through "File Sync" function
of Skaffold.

## Develop with Flask (Not Recommended)

This way the website talks to the staging Mixer which might not be the same version
as the submodule and may have API compatibility issue.

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

## Other Develop Tips

### GKE config

The GKE configuration is stored [here](deploy/gke/prod.yaml).

### placeid2dcid.json

This file is stored in GCS bucket. The bucket is set in the config files
[staging](deploy/gke/staging.yaml) and [prod](deploy/gke/prod.yaml).

### Redis memcache

[Redis memcache](https://pantheon.corp.google.com/memorystore/redis/instances?project=datcom-website-prod) is used for production deployment. Each cluster has
a Redis instance located in the same region.
