# IAM module.

This module provides the GCP resources related to IAM with regards to the Data Commons application suite.

- Creation of GCP workload identity service account.
- Binding of the above SA to the GCP roles required by the DC website application.
- Binding of the above SA to the GCP roles required to interact with the storage project.

This module assumes that the GKE cluster, which is installed separately and will depend on this module, will have [workload identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) enabled.

Note: The installer needs Storage Admin(roles/iam.securityAdmin) role be able to modify IAM permissions on the storage project. Please contact the storage project owner to get the required permissions.

## Usage

```tf
module "dc_iam" {
  source                   =  "../../modules/iam"

  project_id               = "my-project-id"
}
```

Note: Change the source path if the caller module is not from a particular example in the examples folder.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| website\_robot\_account\_id | The prefix of the GCP service account to be created. | `string` | `website-robot` | no |
| project\_id | GCP project id of the Service Account to be created. | `string` | n/a | yes |
| storage\_project\_id | GCP project id of the data storage project. For dc-core team owned instances, | `string` | n/a | yes |

