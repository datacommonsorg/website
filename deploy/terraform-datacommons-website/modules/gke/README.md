# GKE module

This module provides the GCP resources GKE clusters and its initial setup.

## Usage

```tf
module "gke" {
  source                   =  "../../modules/gke"
  project_id               = "my-project-id"
}
```

Note: Change the source path if the caller module is not from a particular example in the examples folder.

## Inputs

| Name                | Description                              | Type     | Default       | Required |
| ------------------- | ---------------------------------------- | -------- | ------------- | :------: |
| project_id          | GCP project id to deploy the cluster to. | `string` | n/a           |   yes    |
| cluster_name_prefix | Prefix of the GKE cluster to create.     | `string` | `datacommons` |    no    |
| region              | Region of GKE cluster                    | `string` | `us-central1` |    no    |
| num_nodes           | # of nodes the cluster should have       | `number` | 1             |    no    |
