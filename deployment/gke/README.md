# Deploy Website to Multiple GKE Clusters

## Prerequisites

- [Create global static IP in GCP](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address#reserve_new_static).
- [Configure the DNS in the domain registrar](https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs#update-dns)).
- [Grant the required IAM roles](https://cloud.google.com/anthos/multicluster-management/connect/prerequisites#grant_iam_roles).

## One Time Setup

```bash
first_time_setup.sh < staging | prod>
```

**NOTE** In GCP console, grant the robot account "GCE Storage Lister" role for the website resource bucket.
TODO(shifucun): Figure out the way to do this in command line.

This step creates clusters and runs all the one time tasks, including:

- Enable API in the project.
- Create service account, set up roles and create service account key.
- Create a cluster in each region
- Setup the config cluster

Each cluster is a regional cluster with 3 zones.

Each node is a configured to e2-highmem-4 machine type that has 4 vCPU and 32G memory.
