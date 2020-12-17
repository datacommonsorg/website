# Deploy Website to Multiple GKE Clusters

You should have owner/editor role to perform the following tasks.

## Prerequisites

- [Create global static IP in GCP](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address#reserve_new_static)
- Update the IP address in cluster.yaml, `ip` field.
- Update the domain in cluster.yaml `domain` field.
- Create a GCS bucket, copy resource files (placeid2dcid.json, etc) to it and update config.yaml `gcs_bucket` field.
- Create api key for "Maps API" and "Place API" and put them in GCP "Secret Manager" with name `maps-api-key`.

## One Time Setup

```bash
./first_time_setup.sh < staging | prod>
```

**NOTE** In IAM, Give the robot account `website-robot@PROJECT_ID.iam.gserviceaccount.com` "GCE Storage Lister" role.
TODO(shifucun): Figure out how to do this with gcloud, without giving "objectAdmin" role.

This step creates clusters and runs all the one time tasks, including:

- Enable API in the project.
- Create service account, set up roles and create service account key.
- Create a cluster in each region
- Setup the config cluster

Each cluster is a regional cluster with 3 zones.

Each node is a configured to e2-highmem-4 machine type that has 4 vCPU and 32G memory.

## DNS setup

- Make sure the managed SSL certificate is "ACTIVE" by checking ["Load balancing" in GCP](https://pantheon.corp.google.com/net-services/loadbalancing/advanced/sslCertificates/list?project=PROJECT_ID&sslCertificateTablesize=50). This can take minutes up to hours.

- [Configure the DNS in the domain registrar](https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs#update-dns)).

## Deploy website manually (not recommended)

```bash
./deploy.sh <staging | prod> region
```

## Add a new cluster

```bash
./create_cluster.sh <staging | prod> <region> <num_nodes>
./setup_config_cluster.sh <staging | prod>
```
