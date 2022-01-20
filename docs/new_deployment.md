# Add a New Deployment Instance

This doc details the steps involved to bring up a new Data Commons instance
`<new_instance>`.

## Setup GCP and GKE

Follow the [GKE Setup Guide](../gke/README.md) to set up a new GCP project and GKE
clusters. When all steps are completed, put `config.yaml` in [deploy/gke](../deploy/gke)
and rename it as `<new_instance>.yaml`.

## Setup Deployment

- Make a new folder `<new_instance>` under [deploy/overlays](../deploy/overlays).

- Copy the [kustomization.yaml
  template](../deploy/overlays/kustomization.yaml.tpl) to the new folder and
  configure the following fields:

  - nameSuffix
  - configMapGenerator[website-configmap].literals.secretProject
  - configMapGenerator[mixer-configmap].literals.mixerProject
  - configMapGenerator[mixer-configmap].literals.serviceName
  - patchesStrategicMerge.spec.replicas

- Add additional patch to the deployment if needed.

- In the repo root, run the following command to inspect the Kubernetes config

  ```bash
  kustomize build deploy/overlays/<new_instance>
  ```

## Deploy to GKE

In the repo root, run:

```bash
./scripts/deploy_gke.sh <new_instance> <region>
```

Then go to GCP Kubernetes page and check the workload, load balancer status and
managed certificate status.

If everything works, try to access the website from the configured domain.

## Restrict Access

Follow the [IAP setup](./iap.md) to use Cloud IAP to restrict access to the new instance.
