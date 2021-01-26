# Deploy Website to Multiple GKE Clusters

You should have owner/editor role to perform the following tasks.

## Prerequisites

- Make a copy of the `config.yaml.tpl` as `config.yaml`.

  ```bash
  cp config.yaml.tpl config.yaml
  ```

- Add the GCP project id in `config.yaml`, **project** field.

- Enable GCP services.

  ```bash
  ./enable_services.sh
  ```

- Create a global static IP in GCP.

  - Run:

    ```bash
    ./create_ip.sh
    ```

  - Record the IP address and update it in `config.yaml`, **ip** field.

- Update the domain in `cluster.yaml` **domain** field.

- Create a GCS bucket, copy resource files (placeid2dcid.json, etc) to it and update `config.yaml` **gcs_bucket** field.

- Create api key for "Maps API" and "Place API" and put them in GCP "Secret Manager" with name **maps-api-key**.

## One Time Setup

```bash
./first_time_setup.sh
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

If you would like to use [Cloud Memorystore](https://cloud.google.com/memorystore/docs/redis/quickstart-gcloud), run

```bash
./create_redis.sh <REGION>
```

Need to run this for all the regions that the app is hosted. The regions can be found in config.yaml.

Record the **host** and **port** as deployment config file ([example](../deploy/overlays/prod/redis.json))
and make a patch to the deployment ([example](../deploy/overlays/patch_deployment.yaml)).

## DNS setup

- Make sure the managed SSL certificate is "ACTIVE" by checking
  ["Load balancing" in GCP](https://pantheon.corp.google.com/net-services/loadbalancing/advanced/sslCertificates/list?project=PROJECT_ID&sslCertificateTablesize=50). This can take minutes up to hours.

  **NOTE** Make sure the certificate is [associated with a target proxy](https://cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting#certificate-managed-status). For mixer, the certificate is linked the target proxy through the [GKE Ingress](mci.yaml.tpl). If they are not linked, then need to manually add the certificate to the load balancing ([example setup in GCP](ssl.png)).

- [Configure the DNS in the domain registrar](https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs#update-dns)).

## Add a new cluster

```bash
./create_cluster.sh <REGION>
../scripts/deploy_gke.sh <"staging"|"prod"> <REGION>
```
