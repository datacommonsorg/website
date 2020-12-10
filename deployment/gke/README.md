# Deployt website to multi GKE cluster

## Prerequisites

- Create global static IP in GCP.
- Configure the DNS in the domain registra.
- [Grant the required IAM roles](https://cloud.google.com/anthos/multicluster-management/connect/prerequisites#grant_iam_roles).

## One Time Setup

```bash
../generate_yaml.sh <staging | prod>
onetime_setup.sh
```

This step creates clusters and make all the one time setup, including:

- Enable API in the project.
- Create service account keys.
- Create a cluster in each region
- Setup the config cluster

Each cluster is a region cluster with 3 nooes in each zone (total 9 nodes).
Each node is a configured to e2-highmem-4 machine type that has 4 vCPU and 32G memory.
