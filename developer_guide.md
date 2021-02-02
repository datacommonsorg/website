# Developer Guide

Website is deployed in Kubernetes cluster. A deployment contains the following
containers:

- website: A Flask app with static files complied by Webpack.
- mixer: The Data Commons API server.
- esp: Google Extensive Service Proxy used for gRPC to Json transcoding.

[Mixer](https://github.com/datacommonsorg/mixer) is a submodule of this Git repo.
The exact commit of the submodule is deployed together with the website so it may
not be the same API version as `api.datacommons.org`. Make sure to update and
track the mixer change for a new deployment:

```bash
git submodule foreach git pull origin master
```

## Prerequisites

- Contact Data Commons team to get dev maps api key.

- Contact Data Commons team to get permission for BigTable and BigQuery permission.

- Get GCP authentication

  ```bash
  gcloud auth application-default login
  ```

- Initialize the mixer submodule

  ```bash
  git submodule update --init --recursive
  ```

- Install the following tools:

  - [`Docker`](https://www.docker.com/products/docker-desktop)
  - [`Minikube`](https://minikube.sigs.k8s.io/docs/start/)
  - [`Skaffold`](https://skaffold.dev/docs/install/)
  - [`gcloud`](https://cloud.google.com/sdk/docs/install)
  - [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
  - [`nodejs`](https://nodejs.org/en/download/)
  - [`kustomize`](https://kustomize.io/)

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

## Develop with Flask (simple/lite)

This way the website talks to the [autopush Mixer](autopush.api.datacommons.org)

Note: the autopushed mixer can deviate from the mixer submodule and may
not be fully compatible with website.

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
./run_server.sh lite
```

This will bring up local website without place search functionality.

## Develop with local Kubernetes

This is an alternative way to bring up website stack locally and this is close
to how the production server is deployed in GKE.

Local Kubernetes cluster has the exact same settings and configurations as the
production deployment. This is recommended way for development.

### Start website in Minikube

```bash
minikube start --memory=6G
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

Run `minikube dashboard` in a separate terminal to start the dashboard, which
is useful for monitoring and controlling the containers.

## Other Developing Tips

### GKE config

The GKE configuration is stored [here](deploy/gke/prod.yaml).

### placeid2dcid.json

This file is stored in GCS bucket. The bucket is set in the config files
[autopush](deploy/gke/autopush.yaml), [staging](deploy/gke/staging.yaml) and
[prod](deploy/gke/prod.yaml).

### Redis memcache

[Redis memcache](https://pantheon.corp.google.com/memorystore/redis/instances?project=datcom-website-prod)
is used for production deployment. Each cluster has a Redis instance located in
the same region.
