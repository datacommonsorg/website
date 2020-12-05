# Bring up the Website App locally in Minikube

Website can be deployed in Kubenetes cluster on [GKE](https://cloud.google.com/kubernetes-engine) or
[MiniKube](https://minikube.sigs.k8s.io/docs/).

This folder contains the config and script for local development with Minikube.

## Prerequisit

- Install `Docker`, following [Docker Desktop](https://www.docker.com/products/docker-desktop) install guide.

- Install `Minikube`, following the [Installation](https://minikube.sigs.k8s.io/docs/start/) guide.

- Install [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/).

- Install [`yq`](https://mikefarah.gitbook.io/yq/).

Set GCP roject

```bash
export GCP_PROJECT="<YOUR_PROJECT>"
```

GCP setup

```bash
gcloud config set project $GCP_PROJECT
gcloud components update
gcloud auth login
```

- If not done yet, run gcloud application credential and copy the auth key:

```bash
gcloud auth application-default login
gcloud iam service-accounts keys create website-robot-key.json \
      --iam-account mixer-robot@$GCP_PROJECT.iam.gserviceaccount.com
# Use the same robot account for website and mixer
cp website-robot-key.json mixer-robot-key.json
```

## Run Minikube cluster

From a terminal, start a cluster:

```bash
minikube start --memory=4g
```

Use local docker image with Minikube.

> **NOTE** Need to run "docker build" after this command to make them usable in deployment.yaml

```bash
eval $(minikube docker-env)
```

Start Minikube dashboard

```bash
minikube dashboard
```

Create a new namespace "website"

```bash
kubectl create namespace website
```

Mount the GCP credential

```bash
kubectl create secret generic website-robot-key --from-file=website-robot-key.json --namespace=website
kubectl create secret generic mixer-robot-key --from-file=mixer-robot-key.json --namespace=website
```

## Generate YAML files

```bash
./generate_yaml.sh
```

## Deploy ESP configuration [One time]

```bash
gsutil cp gs://artifacts.datcom-ci.appspot.com/mixer-grpc/mixer-grpc.latest.pb .
gcloud endpoints services deploy mixer-grpc.latest.pb endpoints.yaml
. env.sh
gcloud services enable $SERVICE_NAME
```

## Build Docker Image [Run after code change]

The build would take a few mintues the first time. Subsquent build should only take a few seconds with docker caching.

```bash
cd ../
docker build --tag website:local .
cd minikube
```

## Deployment to Minikube

```bash
kubectl apply -f deployment.yaml -f service.yaml
```

## Access the service

Use kubectl to forward the port:

```bash
kubectl port-forward service/website-service 8080:8080 -n website
```

Open browser to test out: `localhost:8080`
