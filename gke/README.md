# Deploy Website to Multiple GKE Clusters

You should have owner/editor role to perform the following tasks.

## Prerequisites

- Register a website domain on Google Domain or other registrars.

- Make a copy of the `config.yaml.tpl` as `<ENV>.yaml` and copied it over to
  `deploy/helm_charts/envs/<ENV>.yaml` and fill in the following fields:

  - `project`: the hosting GCP project
  - `domain`: domain of the the website

  ```text
    > The filename used will be the `<ENV>` in subsequent commands. E.g. if you
    > named the yaml file `staging.yaml`, then the `ENV` below is `staging`.
  ```

- Install the following tools:

  - [`gcloud`](https://cloud.google.com/sdk/docs/install)
  - [`Skaffold`](https://skaffold.dev/docs/install/)
  - [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
  - [`kustomize`](https://kustomize.io/)
  - [`yq` 4.x](https://github.com/mikefarah/yq#install)

## One time setup

1. Run the following scripts sequentially. Retry any script if errors occur.

   ```bash
   # Update gcloud
   gcloud components update
   gcloud auth login

   # Enable GCP services
   ./enable_services.sh <ENV>

   # Create a static IP for the domain (Skip this step if you are using apigee proxy)
   ./create_ip.sh <ENV>

   # Create api key for web client maps and places API
   ./create_api_key.sh  <ENV>

   # Create robot account
   ./create_robot_account.sh <ENV>

   # Config robot account IAM in the project
   ./add_policy_binding.sh <ENV>

   # [Ask Data Commons team to run this] Get permission to read Data Commons data
   ./get_storage_permission.sh <ENV>

   # Create SSL certificate
   ./setup_ssl.sh <ENV>

   # Deploy esp service
   ./setup_esp.sh <ENV>

   # [For apigee configurations only] Configure internal load balancer network and dns settings
   ./configure_internal_load_balancer.sh <ENV> <REGION>
   ```

1. Run the following scripts sequentially.

   ```bash
   # Create cluster. Run this for all the regions
   ./create_cluster.sh <ENV> <REGION> <NODES>

   # Deploy helm
   ../scripts/deploy_gke_helm.sh -e <ENV> -l <REGION>
   ```

1. (Optional) If you're using multiple clusters, run the following script to
   setup multi-cluster ingress and services. Use the "-n" flag to include the nodejs server in the setup.

   ```bash
   # Set up multi-cluster ingress and service WITHOUT nodejs
   ./setup_config_cluster.sh <ENV> <REGION>

   # Set up multi-cluster ingress and service WITH nodejs
   ./setup_config_cluster.sh <ENV> <REGION> -n
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

## Update cluster config

If multi-cluster ingress and service needs to be updated, then for each region that needs to be updated, run the following commands. The "-n" flag determines whether or not to set up a nodejs server (include "-n" to setup nodejs).

```bash
gcloud config set project <PROJECT>
./update_config_cluster.sh -e <ENV> -l <REGION> -n
```

where `<ENV>` refers to the name of the instance and `<REGION>` is the region of the cluster.

## Add a cron testing job

Note: By default, the added cron testing job will run every 4 hours. If you want the job to run on a different schedule, update the `schedule` field in [cron_testing_job.yaml.tpl](./cron_testing_job.yaml.tpl) before setting up the job.

To set up cron testing for a cluster, run:

```bash
./setup_cron_testing.sh -e <ENV> -l <REGION>
```

where `<ENV>` refers to the name of the instance and `<REGION>` is the region of the cluster.
If the region is not set, it will default to us-central-1

## (Optional) Configure Apigee

Use [Apigee](https://cloud.google.com/apigee) for API key management, throttling, and logging.

- Open GCP console
- Navigate to Apigee console
- Click "Customize your setup" button
- Follow steps, ensuring that apigee is configured to run in the same region as your GKE cluster (setup takes ~1 hour to complete)
- Use the apigee console to create a new "Instance" in the same region as your GKE cluster. Ensure logging is enabled for the instance.
- Use the apigee console to create a new "Environment Group" (navigate to "Environment" section the choose "Environment Group"). Add applicable hostnames to the environment.
- Use the apigee console to create a new "Environment" for the website named "website-environment" with pricing type "Intermediate". Associate this environment with the above instance.
- Deploy proxy configuration

```bash
../deploy_proxy.sh <ENV>
```

- Update manually update the apigee load balancer to use the `dc-website-cert` certificate
- Ensure a DNS entry is created that points to the apigee load balancer (see b/348045295)
- In the apigee console, [create an "API Product", "App", and "Developer" to instance to generate an API Key](https://cloud.google.com/apigee/docs/api-platform/security/api-keys).
- Include your API key in URL to access Data Commons. Visit https://<your-host>/?apikey=<your-api-key>
