# Deploy Website to Multiple GKE Clusters

You should have owner/editor role to perform the following tasks.

## Prerequisites

- Register a website domain on Google Domain or other registrars.

- Make a copy of the `config.yaml.tpl` as `config.yaml` in the same folder and fill out the following
  fields

  - `project`: the hosting GCP project
  - `domain`: domain of the the website
  - `region.primary`: region for Kubernetes cluster
  - `storage-project`: base Data Commons project (set this to `datcom-store`)

- Install the following tools:

  - [`gcloud`](https://cloud.google.com/sdk/docs/install)
  - [`Skaffold`](https://skaffold.dev/docs/install/)
  - [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
  - [`kustomize`](https://kustomize.io/)
  - [`yq` 4.x](https://github.com/mikefarah/yq#install)

## One time setup

Run the following scripts sequentially. Retry any script if errors occur.

```bash
# Update gcloud
gcloud components update
gcloud auth login

# Enable GCP services
./enable_services.sh

# Create a static IP for the domain
./create_ip.sh

# Create api key for web client maps and places API
./create_api_key.sh

# Create robot account
./create_robot_account.sh

# Config robot account IAM in the project
./add_policy_binding.sh

# [Ask Data Commons team to run this] Get permission to read Data Commons data
./get_storage_permission.sh

# Create SSL certificate
./setup_ssl.sh

# Deploy esp service
./setup_esp.sh

# Create clusters
./create_all_clusters.sh

# Set up multi-cluster ingress and service
./setup_config_cluster.sh
```

## DNS setup

- [Configure the DNS in the domain
  registrar](https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs#update-dns).

- Make sure the managed SSL certificate is "ACTIVE" by checking ["Load
  balancing" in
  GCP](https://pantheon.corp.google.com/net-services/loadbalancing/advanced/sslCertificates/list?project=<PROJECT_ID>&sslCertificateTablesize=50).
  This can take minutes up to hours.

  **NOTE** Make sure the certificate is [associated with a target
  proxy](https://cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting#certificate-managed-status).
  The certificate is linked to the target proxy through the [GKE
  Ingress](mci.yaml.tpl). If they are not linked, need to manually add the
  certificate to the load balancing ([example setup in GCP](ssl.png)).

## Add a new cluster

If new cluster is needed to scale, then run:

```bash
./create_cluster.sh <REGION>
../scripts/deploy_gke_helm.sh -e <ENV> -l <REGION>
```

If the instance uses Redis as memcache, then should follow this [instruction](../docs/redis.md)
to create a new Redis instance.

where `<ENV>` refers to the name of the instance and `<REGION>` is the region of the cluster.
