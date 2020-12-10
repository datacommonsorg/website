# Bring up the Website App locally in Minikube

Website can be deployed in Kubernetes cluster on [GKE](https://cloud.google.com/kubernetes-engine) or
[MiniKube](https://minikube.sigs.k8s.io/docs/).

This folder contains the config and script for local development with Minikube.

## Prerequisites

- Install [`Docker`](https://www.docker.com/products/docker-desktop).

- Install [`Minikube`](https://minikube.sigs.k8s.io/docs/start/).

- Install [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/).

- Install [`yq`](https://mikefarah.gitbook.io/yq/).

## One time setup

```bash
./onetime_setup.sh
```

## Deploy endpoints configuration

**Note** Need to run this regularly to keep track of the mixer service updates.
Ideally, mixer-grpc.pb could be generated locally with protoc, or check the mixer.proto change and only deploy esp service when there is proto change.

```bash
./run_endponit_service.sh
```

## Run Minikube cluster

This will bring up the minikube cluster and keep it running.
You can keep it running in the background or stop it after development to save 4G of memory on you computer.

After seeing the dashboard, type and pick the "website" namespace.

```bash
./run_cluster.sh
```

## Deployment to Minikube

After code change, run the following command to deploy it locally.
TODO(shifucun): Use [Scaffold](https://skaffold.dev/) to manage deployment.

```bash
./deploy_website.sh
```

## Access the service

After successful deployment, use kubectl to forward the port:

```bash
kubectl port-forward service/website-service 8080:8080 -n website
```

Open browser to test out: `localhost:8080`
