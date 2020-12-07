# Deploy process

There are 3 region clusters each with 3 regions (9 nodes), and each node is a
e2-highmem-4 machine type. The region are: `asia-east1`, `europe-west1`, `us-west1`

## Build Docker image and push to Cloud Container Registry

```bash
cd ../
export IMAGE="website:$(git rev-parse --short HEAD)"
DOCKER_BUILDKIT=1 docker build --tag gcr.io/datcom-ci/$IMAGE .
docker push gcr.io/datcom-ci/$IMAGE
```

## Generate YAML files

```bash
./generate_yaml.sh
```

## Setup GCP project

```bash
export PROJECT_ID=datcom-mixer-staging
gcloud auth login
gcloud services enable --project=$PROJECT_ID \
 anthos.googleapis.com \
 multiclusteringress.googleapis.com \
 container.googleapis.com \
 gkeconnect.googleapis.com \
 gkehub.googleapis.com \
 cloudresourcemanager.googleapis.com
```

## Create cluster

Set the GCP region

```bash
export GCP_REGION=('us-west1' 'asia-east1' 'europe-west1')
```

Create Cluster.

**NOTE**: Need to complete the steps in [Grant the required IAM roles](https://cloud.google.com/anthos/multicluster-management/connect/prerequisites#grant_iam_roles) section to register clusters.

```bash
for REGION in "${GCP_REGION[@]}"
do
  echo "Creating GKE cluster in $REGION, please wait ..."
  CLUSTER_NAME="website-${REGION}"
  gcloud container clusters create $CLUSTER_NAME \
    --num-nodes=3 \
    --region=$REGION \
    --machine-type=e2-highmem-4 \
    --enable-ip-alias # VPC native-cluster to enable Ingress for Anthos
done
```

## For each cluster, set up the cluster with the following steps

```bash
for REGION in "${GCP_REGION[@]}"
do
  echo "Deploy website to $REGION, please wait ..."
  CLUSTER_NAME="website-${REGION}"
  gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
  kubectl create namespace website
  # Website robot account
  kubectl create secret generic website-robot-key --from-file=website-robot-key.json --namespace=website
  # Mixer robot account
  kubectl create secret generic mixer-robot-key --from-file=mixer-robot-key.json --namespace=website
  kubectl apply -f deployment.yaml -f ../service.yaml -f ../ingress.yaml
done
```
