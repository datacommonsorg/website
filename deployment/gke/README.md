# Deploy Website to Multiple GKE Clusters

## Prerequisites

- [Create global static IP in GCP](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address#reserve_new_static).
- [Configure the DNS in the domain registrar](https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs#update-dns)).
- [Grant the required IAM roles](https://cloud.google.com/anthos/multicluster-management/connect/prerequisites#grant_iam_roles).

## One Time Setup

```bash
../generate_yaml.sh <staging | prod>
onetime_setup.sh
```

This step creates clusters and runs all the one time tasks, including:

- Enable API in the project.
- Create service account keys.
- Create a cluster in each region
- Setup the config cluster

Each cluster is a region cluster with 3 nodes in each zone (total 9 nodes).
Each node is a configured to e2-highmem-4 machine type that has 4 vCPU and 32G memory.
