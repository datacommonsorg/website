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

   # [Ask Data Commons team to run this] Only if using Vertex AI: Grant permissions for service account to run Vertex AI models
   ./grant_vertex_ai_permissions.sh <ENV>

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

   # (Optional) If enabling agentic apps (e.g. Discover) on this environment, configure their prerequisites (Vertex AI, Model Armor & Cloud Storage APIs, IAM, secrets, default Model Armor template, and GCS config bucket).
   # Pass `--bucket-location us` when creating a config bucket for multi-region environments such as prod (defaults to `us-central1`).
   # Note: For environments using MultiClusterIngress (autopush, staging, prod), also run update_config_cluster.sh
   # (see "Update cluster config" below) so website-mci routes the configured agentic.discover.basePath to website-agentic-mcs.
   ./setup_agentic.sh <ENV>

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

## Agentic apps / Discover runtime configuration and emergency off switch

When `agentic.discover.configBucket` is set in `deploy/helm_charts/envs/<ENV>.yaml`, `./setup_agentic.sh <ENV> [--bucket-location <LOCATION>]` provisions a private, versioned GCS bucket (`gs://<CONFIG_BUCKET>`, prompting for the bucket location on initial creation if `--bucket-location` is omitted and defaulting to `us-central1`; pass `--bucket-location us` for multi-region `prod`) and seeds an initial `agent-config.json` **only when the object does not yet exist**. After initial seeding, `gs://<CONFIG_BUCKET>/agent-config.json` is the authoritative runtime configuration (no config file in Git is synced on deploy).

At pod startup, the `discover` container fetches `gs://<CONFIG_BUCKET>/agent-config.json` as well as optional `gs://<CONFIG_BUCKET>/prompts/{classify,discovery,synthesis,follow_up}.md` overrides (falling back to the image's default prompts for any absent slot) and caches them in memory. Write access to `gs://<CONFIG_BUCKET>` therefore controls both runtime settings and system prompts.

> **Important:** Uploading to `gs://<CONFIG_BUCKET>` should be treated as a live deployment. Even before a manual rollout, any newly scheduled pod (from autoscaling, node upgrades, or pod evictions) will read the uploaded object immediately, so never stage draft files in the bucket without immediately restarting **every** cluster in the environment.

To apply a configuration update (validate against `agent-config.schema.json` in `datacommonsorg/tools`, verify JSON syntax locally, upload, and roll all regional clusters — e.g. `us-central1` for `autopush`/`staging`, or both `us-central1` and `us-west1` for `prod`):

```bash
python3 -m json.tool <LOCAL_AGENT_CONFIG_JSON> >/dev/null
gcloud storage cp <LOCAL_AGENT_CONFIG_JSON> gs://<CONFIG_BUCKET>/agent-config.json \
  --content-type="application/json; charset=utf-8" \
  --project=<PROJECT_ID>

for REGION in <REGIONS>; do
  gcloud container clusters get-credentials website-${REGION} --region=${REGION} --project=<PROJECT_ID>
  kubectl rollout restart deployment/website-agentic-apps -n website
done
```

When agentic apps are enabled on an environment (`agentic.enabled: true`), you can disable Discover chat or take down `website-agentic-apps` (for example, during unexpected traffic spikes, runaway Gemini spend, upstream MCP/Vertex AI outages, or safety incidents) in the following ways:

1. **Immediate bucket-independent override (<30 seconds via `kubectl`, no GCS dependency):**

   Run against **every** regional cluster in the environment:

   ```bash
   for REGION in <REGIONS>; do
     gcloud container clusters get-credentials website-${REGION} --region=${REGION} --project=<PROJECT_ID>

     # Option A: Disable Discover chat only (keeps static UI and shared stories online, stops all Gemini/MCP calls)
     kubectl set env deployment/website-agentic-apps -n website -c discover ENABLE_CHAT=false

     # Option B: Scale down all agentic app pods immediately
     kubectl scale deployment/website-agentic-apps -n website --replicas=0
   done
   ```

   **Note:** While `ENABLE_CHAT` is set on the Deployment, it overrides `chat.enabled` in `gs://<CONFIG_BUCKET>/agent-config.json` (so later bucket edits will have no effect on chat availability until `ENABLE_CHAT` is cleared or overwritten by the next Cloud Deploy release). To clear the override and return control to GCS (or restore replicas after scaling down):

   ```bash
   for REGION in <REGIONS>; do
     gcloud container clusters get-credentials website-${REGION} --region=${REGION} --project=<PROJECT_ID>
     kubectl set env deployment/website-agentic-apps -n website -c discover ENABLE_CHAT-
     kubectl scale deployment/website-agentic-apps -n website --replicas=2
   done
   ```

2. **Persistent across Cloud Deploy releases (via GCS `agent-config.json` or Helm):**

   - **Keep Discover UI online with chat disabled (no PR required):** Set `"chat": { "enabled": false, ... }` in `gs://<CONFIG_BUCKET>/agent-config.json` (validating with `python3 -m json.tool` first), upload to GCS, and restart `website-agentic-apps` across every regional cluster as shown above (ensure any ad-hoc `ENABLE_CHAT` env override has been cleared with `ENABLE_CHAT-`). Set `"enabled": true` and restart all clusters to restore chat.
   - **Remove the deployment and routes (via Helm in Git):** Set `agentic.discover.enabled: false` in `deploy/helm_charts/envs/<ENV>.yaml` to remove the `discover` container and `agentic.discover.basePath` Ingress paths, or set `agentic.enabled: false` to remove the `website-agentic-apps` Deployment, `website-agentic-service` Service, and agentic Ingress paths entirely.

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

If multi-cluster ingress and service needs to be updated, then for each region that needs to be updated, run the following commands. Pass `-n` only if the environment runs the Node.js server.

```bash
gcloud config set project <PROJECT>
./update_config_cluster.sh -e <ENV> -l <REGION>
```

where `<ENV>` refers to the name of the instance and `<REGION>` is the region of the cluster.

## Add a cron testing job

Note: By default, the added cron testing job will run every 4 hours. If you want the job to run on a different schedule, update the `schedule` field in [cron_testing_job.yaml.tpl](./cron_testing_job.yaml.tpl) before setting up the job. Specific test suites (Sanity, Adversarial, Node.js Query) can be controlled via `enableSanity`, `enableAdversarial`, and `enableNodejs` under `cronTesting` in the environment Helm charts. Note that `enableNodejs` defaults to `false` pending Node.js server deprecation.

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
- Use the apigee console to create a new "Environment Group" (navigate to "Environment" section then choose "Environment Group"). Add applicable hostnames to the environment.
- Use the apigee console to create a new "Environment" for the website named "website-environment" with pricing type "Intermediate". Associate this environment with the above instance.
- Deploy proxy configuration

```bash
../deploy_proxy.sh <ENV>
```

- Manually update the apigee load balancer to use the `dc-website-cert` certificate
- Ensure a DNS entry is created that points to the apigee load balancer (see b/348045295)
- In the apigee console, [create an "API Product", "App", and "Developer" to instance to generate an API Key](https://cloud.google.com/apigee/docs/api-platform/security/api-keys).
- Include your API key in URL to access Data Commons. Visit https://<your-host>/?apikey=<your-api-key>
