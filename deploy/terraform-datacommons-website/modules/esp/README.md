# ESP module

This module provides the GCP resources related to setting up [ESP](https://cloud.google.com/endpoints/docs). The Data Commons API uses ESP to provide REST APIs over gRPC services.

## Usage

```tf
module "dc_esp" {
  source                   =  "../../modules/apikeys"
  project_id               = "my-project-id"
}
```

Note: Change the source path if the caller module is not from a particular example in the examples folder.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project\_id | GCP project id where the DC applications will be running in.| `string` | n/a | yes |
| mixer\_grpc\_pb\_gcs\_path | Full GCS path to mixer's compiled grpc protobuf definition. | `string` | `gs://datcom-mixer-grpc/mixer-grpc/mixer-grpc.latest.pb` | no |
