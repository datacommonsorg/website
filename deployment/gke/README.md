# Deploy process

**NOTE** This is an exmperimental version.

There are 3 region clusters each with 3 nodes (9 nodes), and each node is configured with
e2-highmem-4 machine type.

The region are: `asia-east1`, `europe-west1`, `us-west1`.

## Build Docker image and push to Cloud Container Registry

```bash
cd ../
export TAG="$(git rev-parse --short HEAD)"
DOCKER_BUILDKIT=1 docker build --tag gcr.io/datcom-ci/website:$TAG .
DOCKER_BUILDKIT=1 docker build --tag gcr.io/datcom-ci/website:latest .
docker push gcr.io/datcom-ci/website:$TAG
docker push gcr.io/datcom-ci/website:latest
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

## Create a managed ssl certificate

**Note** This is crucial to make the ingress external IP working.

```bash
DOMAIN=test.homeyouwish.com
gcloud compute ssl-certificates create website-certificate \
  --domains=$DOMAIN --global
```

## Create cluster

Set the GCP region

```bash
export GCP_REGION=('us-west1' 'asia-east1' 'europe-west1')
```

Create Cluster.

**NOTE**: Need to complete the steps in [Grant the required IAM roles](https://cloud.google.com/anthos/multicluster-management/connect/prerequisites#grant_iam_roles) section to register clusters.

```bash
export GCP_REGION=('us-west1' 'asia-east1' 'europe-west1')
for REGION in "${GCP_REGION[@]}"
do
  echo "Creating GKE cluster in $REGION, please wait ..."
  CLUSTER_NAME="website-${REGION}"
  gcloud container clusters create $CLUSTER_NAME \
    --num-nodes=3 \
    --region=$REGION \
    --machine-type=e2-highmem-4 \
    --enable-ip-alias # VPC native-cluster to enable Ingress for Anthos

  # Register cluster using Workload Identity ([Documentation](https://cloud.google.com/anthos/multicluster-management/connect/registering-a-cluster#register_cluster))
  gcloud beta container hub memberships register $CLUSTER_NAME \
    --gke-uri=https://container.googleapis.com/v1/projects/$PROJECT_ID/locations/$REGION/clusters/$CLUSTER_NAME \
    --enable-workload-identity
  gcloud projects add-iam-policy-binding \
    $PROJECT_ID \
    --member "serviceAccount:$PROJECT_ID.hub.id.goog[gke-connect/connect-agent-sa]" \
    --role "roles/gkehub.connect"
done
```

## Pick one cluster as the config cluster

```bash
CONFIG_CLUSTER_NAME="website-us-west1"
gcloud alpha container hub ingress enable \
  --config-membership=projects/$PROJECT_ID/locations/global/memberships/$CLUSTER_NAME

# Make sure use the context of the config cluster
kubectl config use-context gke_datcom-mixer-staging_us-west1_website-us-west1
kubectl apply -f mci.yaml
kubectl apply -f mcs.yaml
```

## For each cluster, set up the cluster with the following steps

```bash
for REGION in "${GCP_REGION[@]}"
do
  echo "Deploy website to $REGION, please wait ..."
  CLUSTER_NAME="website-${REGION}"
  gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
  # kubectl create namespace website
  # Website robot account
  # kubectl create secret generic website-robot-key --from-file=website-robot-key.json --namespace=website
  # Mixer robot account
  # kubectl create secret generic mixer-robot-key --from-file=mixer-robot-key.json --namespace=website
  kubectl apply -f deployment.yaml
done
```
