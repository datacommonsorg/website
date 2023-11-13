# API keys module

This module provides the GCP resources related to setting up [API keys](https://cloud.google.com/docs/authentication/api-keys). The Data Commons website uses Google APIs such as the maps and places backend API to display location information.

## Usage

```tf
module "dc_apikeys" {
  source                   =  "../../modules/apikeys"
  project_id               = "my-project-id"
}
```

Note: Change the source path if the caller module is not from a particular example in the examples folder.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project\_id | GCP project id where the DC applications will be running in.| `string` | n/a | yes |
