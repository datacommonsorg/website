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

  - `nameSuffix`
  - `configMapGenerator[website-configmap].literals.secretProject`: the hosting GCP project
  - `configMapGenerator[mixer-configmap].literals.mixerProject`: the hosting GCP project
  - `configMapGenerator[mixer-configmap].literals.serviceName`: set this to `website-esp.endpoints.<the_hosting_GCP_project>.cloud.goog`
  - `patchesStrategicMerge.spec.replicas`: each node in `<new_instance>.yaml` corresponds to 9 replicas.

- Add additional patch to the deployment if needed. See [deploy/gke/overlays/karnataka/patch.yaml](../deploy/gke/overlays/karnataka/patch.yaml) and the associated changes in [kustomization.yaml](../deploy/gke/overlays/karnataka/kustomization.yaml) for an example.

- In the repo root, run the following command to inspect the Kubernetes config

  ```bash
  kustomize build deploy/overlays/<new_instance>
  ```

## [Private Instance] Setup Pub/Sub 
Create a pub/sub topic for mixer to listen to data changes:

```bash
gsutil notification create -t tmcf-csv-reload -f json gs://<BUCKET_NAME>
```

where `<BUCKET_NAME>` is the GCS bucket which contains the TMCF and CSV files for the instance. Updates to the bucket will be reflected in the instance.

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

## [Private Instance] Adding Data
Each data import should be contained within a top-level folder in the GCS bucket associated with the instance. Within each folder, there should be exactly one `manifest.json`, exactly one TMCF file, and one or more CSV files. 

Each `manifest.json` should be structured as follows: 

```
{
    "importName": "<IMPORT_NAME>",
    "provenanceUrl": "<PROVENANCE_URL>",
    "dataDownloadUrl": "<DATA_DOWNLOAD_URL>"
}
```

`<IMPORT_NAME>` will be used to group the Statistical Variables from the import in the website tree hierarchy navigation.

Each TMCF file should have one node entry for each Statistical Variable in the import.

CSV files should be structured so that each Statistical Variable has its own column. The first few columns should be reserved for other StatVarObservation properties, such as  `observationAbout`, `observationDate`, `observationPeriod`, `unit`, etc. 

## Merging Configs
When submitting configs for a new instance, please include `/deploy/gke/<new_instance>.yaml` and `deploy/overlays/<new_instance>/kustomization.yaml`.