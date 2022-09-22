# VPC module.

This module provides the GCP resources related to setting up [VPC](https://cloud.google.com/vpc). VPCs are required to host the Data Commons website.

Creation of new VPC is optional. However, if you choose not to create one, there must be an existing VPC to be used. If you choose to use an existing VPC, you will need to make sure that the GKE pod and service ranges do not collide with other pre-allocated CIDR ranges within the existing VPC.

## Usage

```tf
module "dc_vpc" {
  source                   =  "../../modules/vpc"
  project_id               = "my-project-id"
}
```

Note: Change the source path if the caller module is not from a particular example in the examples folder.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| create\_vpc | Whether to create a new VPC or not. | `bool` | true | no |
| project\_id | GCP project id where the DC applications will be running in.| `string` | n/a | yes |
| network\_name | Name of the VPC network to be created, or the name of an existing one. | `string` | `data-commons-network` | no |
| subnet\_name | Name of the subnet if a new VPC is to be created. | `string` | `data-commons-subnet` | no |
| subnet\_ip | CIDR range of the subnet ip to be used. | `string` | `10.10.10.0/24` | no |
| ip\_range\_pods\_name | The name of the secondary ip range to use for GKE pods. | `string` | `ip-range-pods` | no |
| ip\_range\_pods | Pre-allocated CIDR range for GKE pods. | `string` | `192.168.0.0/18` | no |
| ip\_range\_services\_name | The name of the secondary ip range to use for GKE services. | `string` | `ip-range-svc` | no |
| ip\_range\_services | Pre-allocated CIDR range for GKE services. | `string` | `192.168.64.0/18` | no |
