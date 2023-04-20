# Add a New Deployment Instance

This doc details the steps involved to bring up a new Data Commons instance
`<instance>`.

## Setup GCP and GKE

Follow the [GKE Setup Guide](../gke/README.md) to set up a new GCP project and GKE
clusters. When all steps are completed, put `config.yaml` in [deploy/gke](../deploy/gke)
and rename it as `<instance>.yaml`.

## Setup Deployment

- Make a new folder `<instance>` under [deploy/overlays](../deploy/overlays).

- Copy the [kustomization.yaml
  template](../deploy/overlays/kustomization.yaml.tpl) to the new folder as `kustomization.yaml` and
  configure the following fields:

  - `nameSuffix`
  - `configMapGenerator[website-configmap].literals.flaskEnv`: a unique ID of the deployment, usually `<instance>`. This is used by Flask to config web server.
  - `configMapGenerator[mixer-configmap].literals.hostProject`: the hosting GCP project
  - `configMapGenerator[mixer-configmap].literals.serviceName`: set this to `website-esp.endpoints.<the_hosting_GCP_project>.cloud.goog`
  - `patchesStrategicMerge.spec.replicas`: each node in `<instance>.yaml` corresponds to 9 replicas.

- Add additional patch to the deployment if needed. See [deploy/gke/overlays/karnataka/patch.yaml](../deploy/gke/overlays/karnataka/patch.yaml) and the associated changes in [kustomization.yaml](../deploy/gke/overlays/karnataka/kustomization.yaml) for an example.

- In the repo root, run the following command to inspect the Kubernetes config

  ```bash
  kustomize build deploy/overlays/<instance>
  ```

- Add the new instance to [config.py](../server/lib/config.py), under 'ENV'.

  - `<instance>`
  - `local-<instance>`

- Add new classes in [configmodule.py](../server/configmodule.py):

```python
class <instance>Config(Config):
    <instance> = True
    NAME = <instance>

class Local<instance>Config(LocalConfig):
    <instance> = True
    NAME = <instance>
```

- Add a section in [run_server.sh](run_server.sh):

```bash
elif [[ $ENV == <instance> ]]; then
  export FLASK_ENV=local-<instance>
```

- Add home page routes in [static.py](../server/routes/static.py), under homepage() function:

```python
if current_app.config.get(<instance>, None):
    return render_template('static/<instance>.html')
```

-- Add a new home page `<instance>.html` under [static](../server/templates/static).

## [Custom Instance] Setup Pub/Sub

Create a pub/sub topic for mixer to listen to data changes:

```bash
gsutil notification create -t tmcf-csv-reload -f json gs://<BUCKET_NAME>
```

where `<BUCKET_NAME>` is the GCS bucket which contains the TMCF and CSV files for the instance. Updates to the bucket will be reflected in the instance.

## Deploy to GKE

In the repo root, run:

```bash
./scripts/deploy_gke.sh <instance> <region>
```

Then go to GCP Kubernetes page and check the workload, load balancer status and
managed certificate status.

If everything works, try to access the website from the configured domain.

## Restrict Access

Follow the [IAP setup](./iap.md) to use Cloud IAP to restrict access to the new instance.

## [Custom Instance] Adding Data

Each data import should be contained within a top-level folder in the GCS bucket associated with the instance. Within each folder, there should be exactly one TMCF file, and one or more CSV files.

Each TMCF file should have one node entry for each Statistical Variable in the import.

CSV files should be structured so that each Statistical Variable has its own column. The first few columns should be reserved for other StatVarObservation properties, such as `observationAbout`, `observationDate`, `observationPeriod`, `unit`, etc.

See the template CSV and TMCF files provided under the deploy/ path. They are called: `sample_data.csv.tp` and `sample_tmcf.tmcf.tpl`.

Additionally, each custom instance should also contain a `memdb.json` file. A template file is provided under the `deploy/` path with the name `memdb.json.tpl`. It contains important data import metadata and information about the hierarchical organization of the Statistical Variables (SVs) and Statistical Variable Groups (SVGs). Copy the `memdb.json.tpl` file to the custom instance folder and rename to `memdb.json`. Then make appropriate edits to the file.

The `memdb.json` file must have the following fields:

```json
{
  "importName": "<IMPORT_NAME>",
  "provenanceUrl": "<PROVENANCE_URL>",
  "dataDownloadUrl": "<DATA_DOWNLOAD_URL>"
}
```

`<IMPORT_NAME>` will be used to group the Statistical Variables from the import in the website tree hierarchy navigation.

## Merging Configs

When submitting configs for a new instance, please include `deploy/gke/<instance>.yaml` and `deploy/overlays/<instance>/kustomization.yaml`.
